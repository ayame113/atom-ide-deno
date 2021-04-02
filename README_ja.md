# atom-deno-lsp

deno language serverによる、Atom-IDEのdenoサポート

[English version](./README.md)

![image](https://user-images.githubusercontent.com/40050810/107709560-bba12c00-6d08-11eb-8c45-4e66b51d3da8.png)

## 使い方

1. [deno](https://deno.land/) 1.6以上をインストール
2. この拡張機能をインストール
3. [atom-ide-base](https://atom.io/packages/atom-ide-base)パッケージをインストール

> ⚠️ atom-ide-uiパッケージは非推奨になりました
> ⚠️ atom-ide-javascriptパッケージはNode.js用です。この拡張機能とは関連がありません。

atom-IDEについては[こちら](https://atom-community.github.io/)を参照。





## インストール

設定＞インストール＞`atom-ide-deno`で検索＞インストール

または、コマンドラインで以下を入力
```
apm install atom-ide-deno
```

追加で[atom-ide-base](https://atom.io/packages/atom-ide-base)パッケージをインストールすると使用できる機能が増えます。


## 設定

設定の構成は[vscode_deno](https://github.com/denoland/vscode_deno)と同様です。

 - lsp flags
 -- Enables language server: Language Serverをオンにするかどうか
 -- Enables code lens implementations: コードレンズの設定（現在Atomではサポートされていません）
 -- Enables code lens references: コードレンズの設定（現在Atomではサポートされていません）
 -- Enables lint: lintを有効にするかどうか
 -- Path to import-map: import-mapへのファイルパス（相対パスはプロジェクトフォルダを起点に解決されます）
 -- Path to tsconfig: tsconfigへのファイルパス（相対パスはプロジェクトフォルダを起点に解決されます）
 -- Enables unstable: コードの型チェックに不安定なAPIを用いるかどうか
 - Deno path: Deno実行ファイルへのパス

## 貢献

コントリビュートはお気軽にどうぞ。
このパッケージの開発を引き継ぎたい人はお気軽にお声がけください。


## ライセンス

MITライセンスです。
