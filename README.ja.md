Translations: [English (en)](README.md) [日本語 (ja)](README.ja.md)

# atom-ide-deno

deno language serverによる、Atom-IDEのdenoサポート

これは（denoチームではなく）コミュニティによって製作されたパッケージです。

[English version](https://github.com/ayame113/atom-ide-deno/blob/master/README.md)

![screen shot](https://raw.githubusercontent.com/ayame113/atom-ide-deno/master/screenshot/1.png)

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


## 機能

[atom-languageclientの実装済みリスト](https://github.com/atom-community/atom-languageclient#capabilities)と[denoの実装済みリスト](https://github.com/denoland/deno/issues/8643#issue-758171107)の両方で利用可能となっている機能が使用できます。

## 設定

設定の構成は[vscode_deno](https://github.com/denoland/vscode_deno)と同様です。

 - lsp flags
  - Enables language server: Language Serverをオンにするかどうか
  - Enables code lens implementations: コードレンズの設定（現在Atomではサポートされていません）
  - Enables code lens references: コードレンズの設定（現在Atomではサポートされていません）
  - Enables lint: lintを有効にするかどうか
  - Path to import-map: import-mapへのファイルパス（相対パスはプロジェクトフォルダを起点に解決されます）
  - Path to tsconfig: tsconfigへのファイルパス（相対パスはプロジェクトフォルダを起点に解決されます）
  - Enables unstable: コードの型チェックに不安定なAPIを用いるかどうか
 - Deno path: Deno実行ファイルへのパス


## tips

### lspでdomを有効にするtsconfig.json
```
{
  "compilerOptions": {
    "allowJs": true,
    "esModuleInterop": true,
    "experimentalDecorators": true,
    "inlineSourceMap": true,
    "isolatedModules": true,
    "jsx": "react",
    "lib": ["deno.window", "dom", "esnext"],
    "module": "esnext",
    "strict": true,
    "target": "esnext",
    "useDefineForClassFields": true
  }
}
```

### ルートをプロジェクトフォルダに合わせるimportMap (プロジェクトフォルダ直下に置く)
```
{
	"imports": {
		"/": "./",
		"./": "./"
	}
}
```

### プロジェクトごとに異なる設定を利用する

[project-config](https://atom.io/packages/project-config)や[atomic-management](https://atom.io/packages/atomic-management)などの外部パッケージを利用します。

### デバッグモード

`ctrl-shift-i`でコンソールを開き、以下のコマンドを入力
```
atom.packages.activePackages['atom-ide-deno'].mainModule.isDebug = true
atom.packages.activePackages['atom-ide-deno'].mainModule.restartAllServers()
```

> ⚠️ importMapやtsconfigを編集した後は、手動でエディタを再起動するか、オプションを編集してLSPを再起動してください。


## 貢献

コントリビュートはお気軽にどうぞ。
このパッケージの開発を引き継ぎたい人はお気軽にお声がけください。


## ライセンス

MITライセンスです。
