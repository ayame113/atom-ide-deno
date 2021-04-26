import { config } from "./config";
import { menu } from "../menus/main.json";

import {
  AutoLanguageClient,
  Convert,
  FilteredLogger,
} from "atom-languageclient";
import type {
  ActiveServer,
  LanguageClientConnection,
  LanguageServerProcess,
} from "atom-languageclient";
import type { ServerManager } from "atom-languageclient/lib/server-manager";
import type { Point } from "atom";
import { TextEditor } from "atom";
import type { TextDocumentIdentifier } from "vscode-languageserver-protocol";
import cp from "child_process";

const getDenoPath = () => atom.config.get("atom-ide-deno.path") || "deno";

class DenoLanguageClient extends AutoLanguageClient {
  config = config;
  _isDebug = false;
  _isDebugAtConfigFile: boolean = atom.config.get("core.debugLSP");
  _emptyConnection!: LanguageClientConnection;
  //isDebug=true時に再起動
  get isDebug() {
    return this._isDebug;
  }
  set isDebug(v) {
    this._isDebug = v;
    this.restartAllServers();
  }
  getGrammarScopes() {
    return [
      "source.js",
      "source.jsx",
      "source.ts",
      "source.tsx",
      "JavaScript",
      "TypeScript",
      //'source.gfm', <-not supported at deno lsp
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
    const initializationOptions = atom.config.get("atom-ide-deno.lspFlags");
    //filter empty string
    initializationOptions.importMap = initializationOptions.importMap || void 0;
    initializationOptions.config = initializationOptions.config || void 0;
    //suggest.imports.hosts の入力はArrayだが、渡すときにObjectに変換する必要がある
    //https://github.com/denoland/vscode_deno/blob/main/docs/ImportCompletions.md
    try {
      initializationOptions.suggest.imports.hosts = Object.fromEntries(
        initializationOptions.suggest.imports.hosts.map((
          v: string,
        ) => [v, true]),
      );
    } catch (e) {
      console.log(e);
    }
    if (this.isDebug) {
      console.log(initializationOptions);
    }
    //https://github.com/denoland/deno/pull/8850
    //enableフラグが必要
    return Object.assign(super.getInitializeParams(...args), {
      initializationOptions,
    });
  }
  activate() {
    super.activate();
    onActivate(this);
  }
  restartAllServers(...args: []) {
    console.log("restart Deno Language server");
    atom.notifications.addInfo("restart Deno Language server");
    return super.restartAllServers(...args);
  }
  getLogger() {
    return new FilteredLogger(
      console,
      (lebel) =>
        this._isDebug || this._isDebugAtConfigFile ||
        ["warn", "error"].includes(lebel),
    );
  }
  async getDefinition(...args: [TextEditor, Point]) {
    const res = await super.getDefinition(...args);
    // prettier-ignore
    if (this.isDebug) console.log(res);
    // prettier-ignore
    if (res == null) return null;
    const { definitions, ...others } = res;
    // `deno:/` から始まるカスタムリクエストは相対パスとして解釈されてしまう
    // `deno://` に置換して返す
    return {
      definitions: definitions.map((d) => {
        // prettier-ignore
        if (!d.path) return d;
        // prettier-ignore
        if (typeof d.path != "string") return d;
        // prettier-ignore
        if (
          !d.path.startsWith("deno:/") || d.path.startsWith("deno://")
        ) {
          return d;
        }
        d.path = d.path.replace("deno:/", "deno://");
        return d;
      }),
      ...others,
    };
  }
  startServerProcess(_projectPath: string) {
    console.log("Starting deno language server");
    return cp.spawn(getDenoPath(), ["lsp"], { env: process.env });
  }
  //custom request util
  getCurrentConnection(): Promise<LanguageClientConnection | null> {
    const currentEditor = atom.workspace.getActiveTextEditor();
    if (currentEditor) {
      return this.getConnectionForEditor(currentEditor);
    } else {
      return Promise.resolve(null);
    }
  }
  async getAnyConnection() {
    const activeServers = ((this as any)._serverManager as ServerManager)
      .getActiveServers();
    if (activeServers.length) {
      return activeServers[0].connection;
    }
    //activeServerが空の場合、仮のconnectionを用意
    if (!this._emptyConnection) {
      this._emptyConnection =
        (await ((this as any).startServer("") as Promise<ActiveServer>))
          .connection;
      return this._emptyConnection;
    }
    return this._emptyConnection;
  }
  async sendCustomRequestForCurrentEditor(
    method: string,
    params?: any[] | object,
  ) {
    return (await this.getCurrentConnection())?.sendCustomRequest(
      method,
      params,
    );
  }
  async sendCustomRequestForAnyEditor(method: string, params?: any[] | object) {
    return (await this.getAnyConnection()).sendCustomRequest(method, params);
  }
  //custom request
  getDenoCache(textEditor?: TextEditor) {
    const editor = textEditor || atom.workspace.getActiveTextEditor();
    if (!editor) {
      return;
    }
    return this.sendCustomRequestForCurrentEditor("deno/cache", {
      referrer: Convert.editorToTextDocumentIdentifier(editor),
      uris: [],
    });
  }
  getDenoPerformance() {
    return this.sendCustomRequestForAnyEditor("deno/performance");
  }
  getDenoReloadImportRegistries() {
    return this.sendCustomRequestForAnyEditor("deno/reloadImportRegistries");
  }
  getDenoVirtualTextDocument(textDocumentIdentifier: TextDocumentIdentifier) {
    return this.sendCustomRequestForAnyEditor("deno/virtualTextDocument", {
      textDocument: textDocumentIdentifier,
    });
  }
  //custom request extends
  getDenoCacheAll() {
    const grammarScopes = this.getGrammarScopes();
    // prettier-ignore
    return Promise.all(
      atom.workspace.getTextEditors()
        .filter((editor) =>
          grammarScopes.includes(editor.getGrammar().scopeName)
        )
        .map((editor) => this.getDenoCache(editor)),
    );
  }
  getDenoStatusDocument() {
    return this.getDenoVirtualTextDocument({ uri: "deno:/status.md" });
  }
  async showDenoStatusDocument() {
    return atom.notifications.addInfo("Deno Language Server", {
      description: await this.getDenoStatusDocument(),
      dismissable: true,
      icon: "deno",
    });
  }
}

export default new DenoLanguageClient();
function onActivate(denoLS: DenoLanguageClient) {
  //config変更時にlspを再起動
  //importMap pathの入力途中でfile not foundエラーが出るため、2秒間間引く
  let inputTimeoutId: NodeJS.Timeout;
  atom.config.onDidChange("atom-ide-deno", () => {
    console.log("atom-ide-deno config change caught");
    clearTimeout(inputTimeoutId);
    inputTimeoutId = setTimeout((_) => {
      denoLS.restartAllServers();
    }, 2000);
  });
  atom.config.onDidChange("core.debugLSP", () => {
    denoLS._isDebugAtConfigFile = atom.config.get("core.debugLSP");
    denoLS.restartAllServers();
  });

  //virtual documentを表示
  atom.workspace.addOpener((filePath) => {
    if (!filePath.startsWith("deno://")) {
      return;
    }
    //autoHeightが無いとスクロールバーが出ない
    const editor = new TextEditor({ autoHeight: false });
    //言語モードを設定
    atom.grammars.assignLanguageMode(
      editor.getBuffer(),
      atom.grammars.selectGrammar(filePath, "" /*sourceText*/).scopeName,
    );
    // デフォルトの表示
    editor.setText("// please wait...\n");
    //読み取り専用
    editor.setReadOnly(true);
    //タブ名
    editor.getTitle = () => filePath;
    editor.getLongTitle = () => filePath;
    //保存を無効にする
    // @ts-ignore
    editor.shouldPromptToSave = () => false;
    //閉じるボタンの表示を調整
    editor.isModified = () => false;
    editor.getBuffer().isModified = () => false;
    //pendingモードにする（次回開いたときに表示されないようにする）
    setTimeout((_) => {
      (atom.workspace.getActivePane() as any).setPendingItem(editor);
    }, 500);
    // defer execution until the content display is complete
    // notice: return value is ignored
    type trapFunctionName =
      | "setCursorBufferPosition"
      | "scrollToBufferPosition";
    const trapFunctions: Array<trapFunctionName> = [
      "setCursorBufferPosition",
      "scrollToBufferPosition",
    ];
    const calledArgs: { [P in trapFunctionName]?: any[][] } = {};
    const originalFunctions: { [P in trapFunctionName]?: Function } = {};
    for (const funcName of trapFunctions) {
      calledArgs[funcName] = [];
      originalFunctions[funcName] = editor[funcName];
      editor[funcName] = (...args: any[]) => calledArgs[funcName]?.push(args);
    }
    (async (_) => {
      const doc = await denoLS.getDenoVirtualTextDocument({
        uri: filePath.replace("deno://", "deno:/"),
      });
      try {
        await editor.setText(doc, { bypassReadOnly: true });
      } catch {
        editor.setText(
          `// load was failed. (${filePath.replace("deno://", "deno:/")})`,
          { bypassReadOnly: true },
        );
      } finally {
        // execute deferred function
        for (const funcName of trapFunctions) {
          // @ts-ignore
          editor[funcName] = originalFunctions[funcName];
          // @ts-ignore
          calledArgs[funcName].forEach((args) => editor[funcName](...args));
        }
      }
    })();
    return editor;
  });

  //コマンド登録
  type methodName =
    | "getDenoCacheAll"
    | "getDenoReloadImportRegistries"
    | "restartAllServers"
    | "showDenoStatusDocument";
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
              denoLS[v.methodName as methodName]();
            },
            displayName: `Deno: ${v.label}`,
            description: v.description,
          },
        ]),
    ),
  );
}
