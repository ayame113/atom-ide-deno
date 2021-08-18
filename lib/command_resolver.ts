import { CompositeDisposable } from "atom";
import type { DisposableLike } from "atom";
import { Convert } from "atom-languageclient";
import { render } from "atom-ide-markdown-service/dist/renderer";
import path from "path";

import type { DenoLanguageClient } from "./main";
import * as formatter from "./formatter";
import { logger } from "./logger";
import { getDenoPath } from "./utils";
import { menu } from "../menus/main.json";

export class CommandResolver implements DisposableLike {
  #subscriptions: CompositeDisposable;
  #client: DenoLanguageClient;
  #isDisposed = false;
  constructor(client: DenoLanguageClient) {
    this.#subscriptions = new CompositeDisposable();
    this.#client = client;
    //コマンド登録
    //コマンドの内容はmenu/main.jsonで管理
    this.#subscriptions.add(
      atom.commands.add(
        "atom-workspace",
        Object.fromEntries(
          menu
            .filter((v) => v.label === "Packages")
            .flatMap((v) => v.submenu)
            .filter((v) => v.label === "Deno")
            .flatMap((v) => v.submenu)
            .map((v) => [
              v.command,
              {
                didDispatch: () => {
                  if (
                    typeof this[v.methodName as keyof CommandResolver] !==
                      "function"
                  ) {
                    throw new Error(
                      `Error: ${v.methodName} is not a function.`,
                    );
                  }
                  this[v.methodName as keyof CommandResolver]();
                },
                displayName: `Deno: ${v.label}`,
                description: v.description,
              },
            ]),
        ),
      ),
    );
  }
  dispose() {
    this.#subscriptions.dispose();
    this.#isDisposed = false;
  }
  #assertsNotDisposed = () => {
    if (this.#isDisposed) {
      throw new Error(
        "Error: Could not connect to the language server because the connection was dropped.",
      );
    }
  };
  cacheAllFile() {
    this.#assertsNotDisposed();
    const grammarScopes = this.#client.getGrammarScopes();
    return Promise.all(
      atom.workspace.getTextEditors()
        .filter((editor) =>
          grammarScopes.includes(editor.getGrammar().scopeName)
        )
        .map((editor) =>
          this.#client.request.cache({
            referrer: Convert.editorToTextDocumentIdentifier(editor),
            uris: [],
          }, editor)
        ),
    );
  }
  reloadImportRegistries() {
    this.#assertsNotDisposed();
    this.#client.request.reloadImportRegistries();
  }
  async showLanguageServerStatus() {
    this.#assertsNotDisposed();
    const item = Object.assign(document.createElement("div"), {
      getTitle: () => "Deno Language Server Status",
      getIconName: () => "deno",
      innerHTML: await render(
        await this.#client.request.virtualTextDocument({
          textDocument: { uri: "deno:/status.md" },
        }),
      ),
    });
    item.classList.add("deno-language-server-status");
    const targetPane = atom.workspace.getCenter().getPanes()[0];
    targetPane.activateItem(targetPane.addItem(item));
  }
  restartAllServers() {
    this.#assertsNotDisposed();
    this.#client.restartAllServers();
  }
  formatCurrent() {
    this.#assertsNotDisposed();
    const filePath = atom.workspace.getActiveTextEditor()?.getPath();
    if (!filePath) {
      return;
    }
    formatter.formatFile(getDenoPath(), [], filePath);
  }
  async formatAll() {
    this.#assertsNotDisposed();
    for (const projectPath of atom.project.getPaths()) {
      logger.log(`format: ${projectPath}`);
      const { stderr } = await formatter.formatFile(
        getDenoPath(),
        [
          formatter.options.ignore(
            atom.config.get("atom-ide-deno.format.onCommand.excludDir")
              .map((d: string) => path.resolve(projectPath, d)),
          ),
        ],
        projectPath,
      );
      atom.notifications.addInfo("Deno Format Result", {
        description: stderr.replace(/\n/g, "<br>\n"),
        icon: "deno",
      });
    }
  }
}
