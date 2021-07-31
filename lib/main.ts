import { CompositeDisposable } from "atom";
import type { TextEditor } from "atom";
import type { StatusBar } from "atom/status-bar";
import { AutoLanguageClient } from "atom-languageclient";
import type {
  LanguageClientConnection,
  LanguageServerProcess,
  Logger,
} from "atom-languageclient";
import type { ServerManager } from "atom-languageclient/build/lib/server-manager";
import type { TextDocumentIdentifier } from "vscode-languageserver-protocol";
import cp from "child_process";

import { config, debouncedConfigOnDidChange } from "./config";
import type { atomConfig } from "./config";
import * as autoConfig from "./auto_config";
import { addHookToConnection } from "./connection_hook";
import { CommandResolver } from "./command_resolver";
import { createVirtualDocumentOpener } from "./virtual_documet";
import { getDenoPath } from "./utils";
import { logger } from "./logger";

class DenoLanguageClient extends AutoLanguageClient {
  config: atomConfig = config;
  request!: DenoCustomRequest;
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
    initializationOptions.config = initializationOptions.config || void 0;
    // suggest.imports.hosts の入力はArrayだが、渡すときにObjectに変換する必要がある
    // https://github.com/denoland/vscode_deno/blob/main/docs/ImportCompletions.md
    try {
      initializationOptions.suggest.imports.hosts = Object.fromEntries(
        initializationOptions.suggest.imports.hosts.map((
          v: string,
        ) => [v, true]),
      );
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
    this.request = new DenoCustomRequest(this);
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
    );
    autoConfig.activate({ grammarScopes: this.getGrammarScopes() });
  }
  async deactivate() {
    logger.log("deactivating...");
    autoConfig.deactivate();
    await super.deactivate();
    this.#subscriptions.dispose();
  }
  restartAllServers(...args: []) {
    logger.log("restart Deno Language server");
    atom.notifications.addInfo("restart Deno Language server");
    return super.restartAllServers(...args);
  }
  getLogger(): Logger {
    return logger;
  }
  startServerProcess(_projectPath: string) {
    logger.log("Starting deno language server");
    return cp.spawn(getDenoPath(), ["lsp"], { env: process.env });
  }
  // TODO: should return disposable?
  consumeStatusBar(statusBar: StatusBar) {
    autoConfig.consumeStatusBar(statusBar);
  }
  preInitialization(conn: LanguageClientConnection) {
    super.preInitialization(conn);
    addHookToConnection(conn);
  }
  isFileInProject(editor: TextEditor, projectPath: string) {
    return super.isFileInProject(editor, projectPath) ||
      (editor.getPath()?.startsWith("deno-code://") ?? false);
  }
}

export type { DenoLanguageClient };
export default new DenoLanguageClient();

export class DenoCustomRequest {
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
