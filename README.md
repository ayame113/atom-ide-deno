# atom-deno-lsp

deno language serverによる、Atom-IDEのdenoサポート

## 要件

この拡張機能を使用するには、[deno](https://deno.land/) 1.6.0以上が必要です。

## 機能

この拡張機能はAtom-IDEからdeno language serverを使用する最低限の機能を提供します。

### サポート

 - リンター
 - 補完

deno lspは現在作業中のようです。denoのバージョンアップによって機能が追加されていくはずです。

### 未サポート

 - フォーマッタ
 - デバッガー
 - `deno cache`などの追加機能

実装には更に調査が必要です。

## 貢献

この拡張機能は最小限の実装です。実装を追加する場合は、その機能がlsp側とこのパッケージのどちらで実装されるものか調べる必要があります。(フォーマッタなど)

デバッガーの実装のために[xatom-debug-nodejs](https://github.com/xatom-plugins/xatom-debug-nodejs)を試しましたが、上手くいきませんでした。
デバッガーを実装するもう一つの手段である[atom-ide-javascript](https://github.com/atom-community/atom-ide-javascript)は、中でvscode拡張を呼び出しているようです。理論上は`node --inspect-brk`を`deno run --inspect-brk`に書き換えるだけですが、typescriptの実行方法の違いを処理する必要があります。更に調査が必要です。

コントリビュートはお気軽にどうぞ。
このパッケージの開発を引き継ぎたい人はお気軽にお声がけください。
