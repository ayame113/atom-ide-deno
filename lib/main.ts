import { CompositeDisposable, Disposable } from "atom";
import type { TextEditor } from "atom";
import type { StatusBar } from "atom/status-bar";
import { AutoLanguageClient } from "atom-languageclient";
import type {
  LanguageClientConnection,
  LanguageServerProcess,
  Logger,
} from "atom-languageclient";
import { normalizePath } from "atom-languageclient/build/lib/server-manager";
import type { ServerManager } from "atom-languageclient/build/lib/server-manager";
import type { TextDocumentIdentifier } from "vscode-languageserver-protocol";
import cp from "child_process";
import path from "path";

import { config, debouncedConfigOnDidChange } from "./config";
import type { atomConfig } from "./config";
import * as autoConfig from "./auto_config";
import { CommandResolver } from "./command_resolver";
import { createVirtualDocumentOpener } from "./virtual_documet";
import { getDenoPath } from "./utils";
import { logger } from "./logger";
import { observeOnSaveFormatter } from "./formatter";
import { observeOnSaveCache } from "./cache";
import * as grammar from "./grammar";

class DenoLanguageClient extends AutoLanguageClient {
  config: atomConfig = config;
  request!: DenoCustomRequests;
  notification!: DenoCustomNotifications;
  #subscriptions!: CompositeDisposable;
  getGrammarScopes() {
    return [
      "source.js",
      "source.jsx",
      "source.ts",
      "source.tsx",
      "JavaScript",
      "TypeScript",
      "source.gfm",
      "text.md",
      "source.json",
    ];
  }
  getLanguageName() {
    return "JavaScript";
  }
  getServerName() {
    return "deno-language-server";
  }
  getInitializeParams(...args: [string, LanguageServerProcess]) {
    logger.log("initializing...");
    const initializationOptions = atom.config.get("atom-ide-deno.lspFlags");
    // filter empty string
    initializationOptions.importMap = initializationOptions.importMap || void 0;
    initializationOptions.cache = initializationOptions.cache || void 0;
    initializationOptions.config = initializationOptions.config || void 0;
    initializationOptions.tlsCertificate =
      initializationOptions.tlsCertificate || void 0;
    // suggest.imports.hosts の入力はArrayだが、渡すときにObjectに変換する必要がある
    // https://github.com/denoland/vscode_deno/blob/main/docs/ImportCompletions.md
    try {
      initializationOptions.suggest.imports.hosts = {
        ...Object.fromEntries(
          initializationOptions.suggest.imports.hosts.map((
            v: string,
          ) => [v, true]),
        ),
        ...Object.fromEntries(
          initializationOptions.suggest.imports.excludedHosts.map((
            v: string,
          ) => [v, false]),
        ),
      };
    } catch (e) {
      console.log(e);
    }
    logger.log(initializationOptions);
    //https://github.com/denoland/deno/pull/8850
    //enableフラグが必要
    return Object.assign(super.getInitializeParams(...args), {
      initializationOptions,
    });
  }
  activate() {
    logger.log("activating...");
    import("atom-package-deps").then((mod) =>
      mod.install("atom-ide-deno", true)
    );
    super.activate();
    this.#subscriptions = new CompositeDisposable();
    this.request = new DenoCustomRequests(this);
    this.notification = new DenoCustomNotifications();
    this.#subscriptions.add(
      debouncedConfigOnDidChange(
        "atom-ide-deno.lspFlags",
        () => this.restartAllServers(),
        2000,
      ),
      debouncedConfigOnDidChange(
        "atom-ide-deno.path",
        () => this.restartAllServers(),
        2000,
      ),
      atom.config.observe("atom-ide-deno.advanced.debugMode", logger.observer),
      createVirtualDocumentOpener(this),
      new CommandResolver(this),
      observeOnSaveFormatter(),
      observeOnSaveCache(),
      this.notification.onRegistryState((registry) => {
        if (registry.suggestions) {
          // add host to imports.hosts
          atom.config.set("atom-ide-deno.lspFlags.suggest.imports.hosts", [
            ...new Set(
              atom.config.get("atom-ide-deno.lspFlags.suggest.imports.hosts"),
            ).add(registry.origin),
          ]);
          // remove host from imports.excludedHosts
          const excludedHosts = new Set(
            atom.config.get(
              "atom-ide-deno.lspFlags.suggest.imports.excludedHosts",
            ),
          );
          excludedHosts.delete(registry.origin);
          atom.config.set(
            "atom-ide-deno.lspFlags.suggest.imports.excludedHosts",
            [...excludedHosts],
          );
        } else {
          // remove host from imports.hosts
          const excludedHosts = new Set(
            atom.config.get(
              "atom-ide-deno.lspFlags.suggest.imports.hosts",
            ),
          );
          excludedHosts.delete(registry.origin);
          atom.config.set(
            "atom-ide-deno.lspFlags.suggest.imports.hosts",
            [...excludedHosts],
          );
          // add host to imports.excludedHosts
          atom.config.set(
            "atom-ide-deno.lspFlags.suggest.imports.excludedHosts",
            [
              ...new Set(
                atom.config.get(
                  "atom-ide-deno.lspFlags.suggest.imports.excludedHosts",
                ),
              ).add(registry.origin),
            ],
          );
        }
      }),
    );
    autoConfig.activate({ grammarScopes: this.getGrammarScopes() });
    grammar.activate();
  }
  async deactivate() {
    logger.log("deactivating...");
    autoConfig.deactivate();
    await super.deactivate();
    this.#subscriptions.dispose();
  }
  restartAllServers(...args: []) {
    logger.log("restart Deno Language server");
    return super.restartAllServers(...args);
  }
  getLogger(): Logger {
    return logger;
  }
  startServerProcess(_projectPath: string) {
    logger.log("Starting deno language server");
    return cp.spawn(getDenoPath(), ["lsp"], { env: process.env });
  }
  preInitialization(conn: LanguageClientConnection) {
    super.preInitialization(conn);
    this.notification.addConnection(conn);
  }
  isFileInProject() {
    return true;
  }
  determineProjectPath(textEditor: TextEditor) {
    const projectPath = super.determineProjectPath(textEditor);
    if (projectPath) {
      return projectPath;
    }
    // When projectPath is null, use the directory where the file exists as the project path.
    const editorPath = textEditor.getPath();
    if (typeof editorPath !== "string") {
      return null;
    }
    return normalizePath(path.dirname(editorPath));
  }
  getLanguageIdFromEditor(editor: TextEditor) {
    if (editor.getGrammar().scopeName === "source.gfm") {
      return "markdown";
    }
    return super.getLanguageIdFromEditor(editor);
  }
  // TODO: should return disposable?
  consumeStatusBar(statusBar: StatusBar) {
    autoConfig.consumeStatusBar(statusBar);
  }
}

export type { DenoLanguageClient };
export default new DenoLanguageClient();

class DenoCustomRequests {
  #client: DenoLanguageClient;
  #emptyConnection?: LanguageClientConnection;
  constructor(client: DenoLanguageClient) {
    this.#client = client;
  }
  #getConnection = async (editor?: TextEditor) => {
    const serverManager =
      // deno-lint-ignore no-explicit-any
      ((this.#client as any)._serverManager as ServerManager);
    if (editor) {
      const server = (await serverManager.getServer(editor));
      if (!server) {
        throw new Error("has no connection");
      }
      return server.connection;
    }
    const activeServers = serverManager.getActiveServers();
    if (activeServers.length) {
      const server = activeServers.find((c) => c.connection.isConnected);
      if (server) {
        return server.connection;
      }
    }
    //activeServerが空の場合、仮のconnectionを用意
    if (!this.#emptyConnection) {
      this.#emptyConnection = (await serverManager.startServer(
        (await serverManager.getNormalizedProjectPaths())[0],
      )).connection;
    }
    return this.#emptyConnection;
  };
  #sendCustomRequest = async <T extends CustomRequestName>(
    requestName: T,
    requestParam: CustomRequestParameter<T>,
    editor?: TextEditor,
  ): CustomRequestReturn<T> => {
    return (await this.#getConnection(editor)).sendCustomRequest(
      requestName,
      requestParam,
    );
  };
  cache(
    param: CustomRequestParameter<"deno/cache">,
    editor: TextEditor,
  ) {
    return this.#sendCustomRequest("deno/cache", param, editor);
  }
  performance() {
    return this.#sendCustomRequest("deno/performance", undefined);
  }
  reloadImportRegistries() {
    return this.#sendCustomRequest("deno/reloadImportRegistries", undefined);
  }
  virtualTextDocument(
    param: CustomRequestParameter<"deno/virtualTextDocument">,
  ) {
    return this.#sendCustomRequest("deno/virtualTextDocument", param);
  }
}

type CustomRequestName = keyof CustomRequest;
type CustomRequestParameter<T extends CustomRequestName> =
  CustomRequest[T]["param"];
type CustomRequestReturn<T extends CustomRequestName> = Promise<
  CustomRequest[T]["return"]
>;

interface CustomRequest {
  "deno/cache": {
    param: {
      referrer: TextDocumentIdentifier;
      uris: TextDocumentIdentifier[];
    };
    return: void;
  };
  "deno/performance": {
    param: undefined;
    return: void;
  };
  "deno/reloadImportRegistries": {
    param: undefined;
    return: void;
  };
  "deno/virtualTextDocument": {
    param: {
      textDocument: TextDocumentIdentifier;
    };
    return: string;
  };
}

class DenoCustomNotifications {
  #notificationCallbacks: CustomNotificationRegistry;
  constructor() {
    this.#notificationCallbacks = {
      "deno/registryState": new Set(),
    };
  }
  addConnection(connection: LanguageClientConnection) {
    connection.onCustomNotification("deno/registryState", (arg) => {
      for (
        const callback of this.#notificationCallbacks["deno/registryState"]
      ) {
        callback(arg as CustomNotificationParameter<"deno/registryState">);
      }
    });
  }
  onRegistryState(
    callback: CustomNotificationCallback<"deno/registryState">,
  ): Disposable {
    this.#notificationCallbacks["deno/registryState"].add(callback);
    return new Disposable(() => {
      this.#notificationCallbacks["deno/registryState"].delete(callback);
    });
  }
}

interface CustomNotification {
  "deno/registryState": {
    param: {
      origin: string;
      suggestions: boolean;
    };
  };
}

type CustomNotificationName = keyof CustomNotification;
type CustomNotificationParameter<T extends CustomNotificationName> =
  CustomNotification[T]["param"];
type CustomNotificationCallback<T extends CustomNotificationName> = (
  arg: CustomNotificationParameter<T>,
) => void;
type CustomNotificationRegistry = {
  [key in CustomNotificationName]: Set<CustomNotificationCallback<key>>;
};
