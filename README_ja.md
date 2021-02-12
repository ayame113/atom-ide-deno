# atom-deno-lsp

deno language serverによる、Atom-IDEのdenoサポート

[English version](./README.md)

![image](https://user-images.githubusercontent.com/40050810/107709560-bba12c00-6d08-11eb-8c45-4e66b51d3da8.png)

## 要件

この拡張機能を使用するには、[deno](https://deno.land/) 1.6.0以上が必要です。

## 機能

この拡張機能はAtom-IDEからdeno language serverを使用できる最低限の機能を提供します。

### サポート

 - リンター
 - 補完

deno lspは現在作業中のようです。denoのバージョンアップによって機能が追加されていくはずです。

### 未サポート

 - フォーマッタ
 - デバッガー
 - `deno cache`などの追加機能

実装するには更に調査が必要です。

## インストール

設定＞インストール＞`atom-ide-deno`で検索＞インストール

または、コマンドラインで以下を入力
```
apm install atom-ide-deno
```

追加で[atom-ide-base](https://atom.io/packages/atom-ide-base)パッケージをインストールすると使用できる機能が増えます。詳しくは[こちら](https://atom-community.github.io/)を参照。


## 貢献

この拡張機能は最小限の実装です。フォーマッタなどの機能を追加する場合、lspから機能が提供されるのか、拡張機能側でコマンド呼び出しを実装する必要があるのかを調べる必要があります。

デバッガーの実装には`chrome devtool protocol`を使用する必要があります。理論上は、既存の拡張機能を使用して`node --inspect-brk`を`deno run --inspect-brk`に書き換えるだけです。

まず[xatom-debug-nodejs](https://github.com/xatom-plugins/xatom-debug-nodejs)を試しましたが、上手くいきませんでした。

次に試した[atom-ide-javascript](https://github.com/atom-community/atom-ide-javascript)は、中でvscode拡張を呼び出しているようです。ここでtypescriptの実行方法の違いを処理する必要があります。更に調査が必要です。

コントリビュートはお気軽にどうぞ。
このパッケージの開発を引き継ぎたい人はお気軽にお声がけください。


## ライセンス

MITライセンスです。
