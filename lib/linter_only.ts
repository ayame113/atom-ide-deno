import type { PublishDiagnosticsParams } from "vscode-languageserver-protocol";

// 副作用がある
// target: DenoLanguageClientに対してLinterOnlyModeを追加する
export function addLinterOnlyMode(target: any) {
  //LinterOnlyの時はLinter以外の情報を返さない
  //それぞれの関数で返すべきデフォルト値
  //機能が追加された場合(package.jsonのprovide/consume)はここにデフォルト値を追加
  const functionResults = {
    getDatatip: null,
    getSuggestions: [],
    getDefinition: null,
    getOutline: null,
    getReferences: null,
    getRangeCodeFormat: [],
    getFileCodeFormat: [],
    getOnTypeCodeFormat: [],
    getCodeHighlight: null,
    getCodeActions: null,
    getRename: null,
  };
  //関数を横取りしてLinterOnlyを判定
  for (
    const [functionName, defaultReturnvalue] of Object.entries(functionResults)
  ) {
    const original = target[functionName];
    target[functionName] = (...args: any[]) => {
      //LinterOnlyの時はデフォルト値を返す
      if (target._linterOnly) {
        return defaultReturnvalue;
      }
      return original.call(target, ...args);
    };
  }
  //signatureHelpは横取りできないので、preInitialization内でconnectionの関数を横取り
  {
    const original = target.preInitialization;
    target.preInitialization = (connection: any, ...args: any[]) => {
      original.call(target, connection, ...args);
      const originalSignatureHelp = connection.signatureHelp;
      connection.signatureHelp = (...signatureHelpArgs: any) => {
        if (target._linterOnly) {
          return null;
        }
        return originalSignatureHelp.call(connection, ...signatureHelpArgs);
      };
      const originalOnPublishDiagnostics = connection.onPublishDiagnostics;
      connection.onPublishDiagnostics = (
        callback: Function,
        ...args: any[]
      ) => {
        originalOnPublishDiagnostics.call(
          connection,
          (result: PublishDiagnosticsParams) => {
            if (!target._linterOnly || result == null) {
              callback(result);
              return;
            }
            const { diagnostics, ...other } = result;
            callback({
              diagnostics: diagnostics.filter((v) => v.source == "deno-lint"),
              ...other,
            });
          },
          ...args,
        );
      };
    };
  }
  return target;
}
