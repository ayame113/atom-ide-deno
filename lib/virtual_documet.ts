import { TextEditor } from "atom";
import type { Disposable } from "atom";

import type { DenoLanguageClient } from "./main";
import { trapMethod } from "./utils";

export function createVirtualDocumentOpener(
  client: DenoLanguageClient,
): Disposable {
  //virtual documentを表示
  return atom.workspace.addOpener((filePath) => {
    if (!filePath.startsWith("deno-code://")) {
      return;
    }
    //autoHeightが無いとスクロールバーが出ない
    const editor = new TextEditor({ autoHeight: false });
    //言語モードを設定
    atom.grammars.assignLanguageMode(
      editor.getBuffer(),
      atom.grammars.selectGrammar(filePath, "" /*sourceText*/).scopeName,
    );
    // パスの設定
    editor.getBuffer().getPath = () => filePath;
    // 保存時の「無効なパス」エラーを回避
    editor.save = () => Promise.resolve();
    editor.saveAs = () => Promise.resolve();
    // デフォルトの表示
    editor.setText("// please wait...\n");
    //読み取り専用
    editor.setReadOnly(true);
    //タブ名
    editor.getTitle = () => filePath;
    editor.getLongTitle = () => filePath;
    //保存を無効にする
    // @ts-ignore: no type
    editor.shouldPromptToSave = () => false;
    //閉じるボタンの表示を調整
    editor.isModified = () => false;
    editor.getBuffer().isModified = () => false;
    //pendingモードにする（次回開いたときに表示されないようにする）
    setTimeout((_) => {
      // deno-lint-ignore no-explicit-any
      (atom.workspace.getActivePane() as any).setPendingItem(editor);
    }, 500);
    // defer execution until the content display is complete
    const { endTrap: endCursorTrap } = trapMethod(
      editor,
      "setCursorBufferPosition",
    );
    const { endTrap: endScrollTrap } = trapMethod(
      editor,
      "scrollToBufferPosition",
    );
    (async () => {
      try {
        const doc = await client.request.virtualTextDocument({
          textDocument: {
            uri: filePath,
          },
        });
        editor.setText(doc, { bypassReadOnly: true });
      } catch {
        editor.setText(
          `// load was failed. (${filePath})`,
          { bypassReadOnly: true },
        );
      } finally {
        // execute deferred function
        setTimeout(() => {
          endCursorTrap();
          endScrollTrap();
        }, 300);
      }
    })();
    return editor;
  });
}
