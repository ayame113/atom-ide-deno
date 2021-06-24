import { config, keyboardInputsKeyPath } from "./config";
import type { atomConfig } from "./config";
import * as formatter from "./formatter";
import { addLinterOnlyMode } from "./linter_only";
import * as autoConfig from "./auto_config";
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
import { CompositeDisposable, TextEditor } from "atom";
import type { StatusBar } from "atom/status-bar";
import type { TextDocumentIdentifier } from "vscode-languageserver-protocol";
import cp from "child_process";
import path from "path";

// to call hierarchy
import CallHierarchyAdapter from "./adapters/call-hierarchy-adapter";
import type { CallHierarchyProvider } from "./adapters/call-hierarchy";

const getDenoPath = (): string =>
  atom.config.get("atom-ide-deno.path") || "deno";

class DenoLanguageClient extends AutoLanguageClient {
  config: atomConfig = config;
  _isDebug!: boolean;
  _emptyConnection!: LanguageClientConnection;
  subscriptions!: CompositeDisposable;
  //isDebug=true時に再起動
  async setDebugMode(isDebug: boolean) {
    this._isDebug = isDebug;
    await this.restartAllServers();
  }
  debugLog(...msg: any[]) {
    if (this._isDebug) {
      console.trace(...msg);
    }
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
    this.debugLog("initializing...");
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
    this.debugLog(initializationOptions);
    //https://github.com/denoland/deno/pull/8850
    //enableフラグが必要
    return Object.assign(super.getInitializeParams(...args), {
      initializationOptions,
    });
  }
  activate() {
    this.debugLog("activating...");
    super.activate();
    this.subscriptions = new CompositeDisposable();
    onActivate(this);
    autoConfig.activate({ grammarScopes: this.getGrammarScopes() });
  }
  async deactivate() {
    this.debugLog("deactivating...");
    autoConfig.deactivate();
    await super.deactivate();
    this.subscriptions?.dispose();
  }
  restartAllServers(...args: []) {
    this.debugLog("restart Deno Language server");
    atom.notifications.addInfo("restart Deno Language server");
    return super.restartAllServers(...args);
  }
  getLogger() {
    return new FilteredLogger(
      console,
      (lebel) => this._isDebug || ["warn", "error"].includes(lebel),
    );
  }
  async getDefinition(...args: [TextEditor, Point]) {
    const res = await super.getDefinition(...args);
    this.debugLog(res);
    if (res == null) return null;
    const { definitions, ...others } = res;
    // `deno:/` から始まるカスタムリクエストは相対パスとして解釈されてしまう
    // `deno://` に置換して返す
    return {
      definitions: definitions.map((d) => {
        if (!d.path) return d;
        if (typeof d.path != "string") return d;
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
  formatCurrent() {
    const filePath = atom.workspace.getActiveTextEditor()?.getPath();
    if (!filePath) {
      return;
    }
    formatter.formatFile(getDenoPath(), [], filePath);
  }
  async formatAll() {
    for (const projectPath of atom.project.getPaths()) {
      console.log(`format: ${projectPath}`);
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
  // DenoMode / NodeMode
  _linterOnly = false;
  setLinterOnlyMode(v: boolean) {
    this._linterOnly = v;
  }
  consumeStatusBar(statusBar: StatusBar) {
    autoConfig.consumeStatusBar(statusBar);
  }
  callHierarchy?: CallHierarchyAdapter;
  provideCallHierarchy(): CallHierarchyProvider {
    return {
      name: this.name,
      grammarScopes: this.getGrammarScopes(),
      priority: 1,
      getIncomingCallHierarchy: this.getIncomingCallHierarchy.bind(this),
      getOutgoingCallHierarchy: this.getOutgoingCallHierarchy.bind(this),
    };
  }
  async getIncomingCallHierarchy(editor: TextEditor, point: Point) {
    // TODO: remove any
    const server = await ((this as any)._serverManager as ServerManager)
      .getServer(editor);
    if (server == null || !CallHierarchyAdapter.canAdapt(server.capabilities)) {
      return null;
    }
    this.callHierarchy = this.callHierarchy || new CallHierarchyAdapter();
    return this.callHierarchy.getCallHierarchy(
      server.connection,
      editor,
      point,
      "incoming",
    );
  }
  async getOutgoingCallHierarchy(editor: TextEditor, point: Point) {
    // TODO: remove any
    const server = await ((this as any)._serverManager as ServerManager)
      .getServer(editor);
    if (server == null || !CallHierarchyAdapter.canAdapt(server.capabilities)) {
      return null;
    }
    this.callHierarchy = this.callHierarchy || new CallHierarchyAdapter();
    return this.callHierarchy.getCallHierarchy(
      server.connection,
      editor,
      point,
      "outgoing",
    );
  }
}

export default addLinterOnlyMode(new DenoLanguageClient());
function onActivate(denoLS: DenoLanguageClient) {
  //config変更時にlspを再起動
  //文字列の入力途中でfile not foundエラーが出るため、2秒間間引く
  let inputTimeoutId: NodeJS.Timeout;
  function restartServer(
    { oldValue = {}, newValue }: { oldValue?: any; newValue: any },
    keyPathbase: string[],
  ) {
    console.log("atom-ide-deno config change caught");
    clearTimeout(inputTimeoutId);
    let isDefferRestart = false;
    //keyboardInputsKeyPathに含まれるキーの値が変更されていれば、実行を延期（間引く）
    for (const keyPath of keyboardInputsKeyPath) {
      //無関係なkeyPathは無視
      if (!keyPathbase.every((v, i) => keyPath[i] == v)) {
        continue;
      }
      //keyPathbaseを起点としてdiff
      let oldV = oldValue;
      let newV = newValue;
      for (const key of keyPath.slice(keyPathbase.length)) {
        oldV = oldV?.[key];
        newV = newV?.[key];
      }
      //値は配列か文字列か数値
      isDefferRestart = JSON.stringify(oldV) !== JSON.stringify(newV);
      if (isDefferRestart) {
        break;
      }
    }
    if (isDefferRestart) {
      inputTimeoutId = setTimeout(() => {
        denoLS.restartAllServers();
      }, 2000);
    } else {
      denoLS.restartAllServers();
    }
  }
  denoLS.subscriptions.add(
    atom.config.onDidChange(
      "atom-ide-deno.lspFlags",
      (v) => restartServer(v, ["lspFlags"]),
    ),
    atom.config.onDidChange(
      "atom-ide-deno.path",
      (v) => restartServer(v, ["path"]),
    ),
    atom.config.observe("atom-ide-deno.advanced.debugMode", (newValue) => {
      denoLS.setDebugMode(newValue);
    }),
    atom.config.observe("atom-ide-deno.advanced.linterOnly", (newValue) => {
      denoLS.setLinterOnlyMode(newValue);
    }),
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
      (async () => {
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
    }),
    //コマンド登録
    //コマンドの内容はmenu/main.jsonで管理
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
                type methodName =
                  | "getDenoCacheAll"
                  | "getDenoReloadImportRegistries"
                  | "restartAllServers"
                  | "showDenoStatusDocument"
                  | "formatAll";
                denoLS[v.methodName as methodName]();
              },
              displayName: `Deno: ${v.label}`,
              description: v.description,
            },
          ]),
      ),
    ),
    // save on format
    atom.workspace.observeTextEditors((editor) => {
      denoLS.subscriptions?.add(
        editor.onDidSave(({ path }) => {
          if (!atom.config.get("atom-ide-deno.format.onSave.enable")) {
            console.log(`ignored format(disabled): ${path}`);
            return;
          }
          if (
            !atom.config.get(
              `atom-ide-deno.format.onSave.extensions.${
                editor.getGrammar().scopeName.replace(/\./g, "_")
              }`,
            )
          ) {
            console.log(`ignored format(exclude extension): ${path}`);
            return;
          }
          console.log(`format: ${path}`);
          formatter.formatFile(getDenoPath(), [], path);
        }),
      );
    }),
  );
}
