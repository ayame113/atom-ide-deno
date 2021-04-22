import {AutoLanguageClient, Convert} from 'atom-languageclient'
import type {LanguageServerProcess, LanguageClientConnection, ActiveServer} from 'atom-languageclient'
import type {ServerManager} from 'atom-languageclient/lib/server-manager'
import type {Point} from "atom"
import {TextEditor} from "atom"
import type {TextDocumentIdentifier} from "vscode-languageserver-protocol";
import cp from 'child_process'

const getDenoPath = ()=>atom.config.get('atom-ide-deno.path')||'deno'

let isDebug = false
:::
class DenoLanguageClient extends AutoLanguageClient {
	_emptyConnection!: LanguageClientConnection
	//isDebug=true時に再起動
	get isDebug() {return isDebug}
	set isDebug(v) {
		isDebug = v
		this.restartAllServers()
	}
	getGrammarScopes () {
		return [
			'source.js',
			'source.jsx',
			'source.ts',
			'source.tsx',
			'JavaScript',
			'TypeScript',
			//'source.gfm', <-not supported at deno lsp
			'source.json',
		]
	}
	getLanguageName () { return 'JavaScript' }
	getServerName () { return 'deno-language-server' }
	getInitializeParams(...args: [string, LanguageServerProcess]) {
		const initializationOptions = atom.config.get('atom-ide-deno.lspFlags')
		//filter empty string
		initializationOptions.importMap = initializationOptions.importMap||void 0
		initializationOptions.config = initializationOptions.config||void 0
		//suggest.imports.hosts の入力はArrayだが、渡すときにObjectに変換する必要がある
		//https://github.com/denoland/vscode_deno/blob/main/docs/ImportCompletions.md
		try {
			initializationOptions.suggest.imports.hosts = Object.fromEntries(initializationOptions.suggest.imports.hosts.map((v: string)=>[v, true]))
		} catch(e) {console.log(e)}
		if (this.isDebug) {console.log(initializationOptions)}
		//https://github.com/denoland/deno/pull/8850
		//enableフラグが必要
		return Object.assign(
			super.getInitializeParams(...args),
			{initializationOptions}
		)
	}
	restartAllServers(...args: []) {
		console.log('restart Deno Language server')
		atom.notifications.addInfo('restart Deno Language server')
		return super.restartAllServers(...args)
	}
	/*getSuggestionDetailsOnSelect(suggestion, ...args) {
		//insertTextFormat==2の場合、スニペットとして解釈される
		//スニペット用のテキストがlspから提供されてないので、通常の補完として利用する
		if (this.isDebug) {console.log(suggestion)}
		if (suggestion.snippet==='') {
			suggestion.snippet = void 0
		}
		return super.getSuggestionDetailsOnSelect(suggestion, ...args)
	}*/
	async getDefinition(...args: [TextEditor, Point]) {
		const res = await super.getDefinition(...args)
		if (this.isDebug) {console.log(res)}
		if (res==null) {return null}
		const {definitions, ...others} = res
		// `deno:/` から始まるカスタムリクエストは相対パスとして解釈されてしまう
		// `deno://` に置換して返す
		return {
			definitions: definitions.map(d=>{
				if (!d.path) {return d}
				if (typeof d.path!='string') {return d}
				if (!d.path.startsWith('deno:/') || d.path.startsWith('deno://')) {return d}
				d.path = d.path.replace('deno:/', 'deno://')
				return d
			}),
			...others
		}
	}
	startServerProcess(_projectPath: string) {
		console.log('Starting deno language server')
		//if (!this.isDebug) {
			return cp.spawn(getDenoPath(), ['lsp'], {env: process.env})
		//} else {
			/*const formatData = data=>data.toString().split('\n').map(v=>{
				try {return JSON.parse(v)}
				catch (_) {return v}
			})
			const env = process.env
			console.log(env)
			const childProcess = cp.spawn(getDenoPath(), ['lsp'], {
				env: env
			})
			const originalWriter = childProcess.stdin.write
			childProcess.stdin.write = function (...args) {
				console.log('[stdin]', ...args.flatMap(formatData))
				originalWriter.apply(childProcess.stdin, args)
			}
			childProcess.stdout.on('data', (data) => {
				console.log('[stdout]', ...formatData(data))
			})
			childProcess.stderr.on('data', (data) => {
				console.log('[stderr]', ...formatData(data))
			})
			childProcess.on('close', exitCode => {
				if (!childProcess.killed) {
					atom.notifications.addError('Deno language server stopped unexpectedly.', {
						dismissable: true,
						description: this.processStdErr ? `<code>${this.processStdErr}</code>` : `Exit code ${exitCode}`
					})
				}
				console.log(this.processStdErr)
			})
			return childProcess*/
		//}
	}
	//custom request util
	getCurrentConnection(): Promise<LanguageClientConnection | null> {
		const currentEditor = atom.workspace.getActiveTextEditor()
		if (currentEditor) {
			return this.getConnectionForEditor(currentEditor)
		} else {
			return Promise.resolve(null)
		}
	}
	async getAnyConnection() {
		const activeServers = ((this as any)._serverManager as ServerManager).getActiveServers()
		if (activeServers.length) {
			return activeServers[0].connection
		}
		//activeServerが空の場合、仮のconnectionを用意
		if (!this._emptyConnection) {
			this._emptyConnection = (await ((this as any).startServer('') as Promise<ActiveServer>)).connection
			return this._emptyConnection
		}
		return this._emptyConnection
	}
	async sendCustomRequestForCurrentEditor(method: string, params?: any[] | object) {
		return (await this.getCurrentConnection())?.sendCustomRequest(method, params)
	}
	async sendCustomRequestForAnyEditor(method: string, params?: any[] | object) {
		return (await this.getAnyConnection()).sendCustomRequest(method, params)
	}
	//custom request
	provideDenoCache(textEditor: TextEditor) {
		return this.sendCustomRequestForCurrentEditor(
			'deno/cache', {
				referrer: Convert.editorToTextDocumentIdentifier(
					textEditor||atom.workspace.getActiveTextEditor()
				),
				uris: []
			}
		)
	}
	provideDenoPerformance() {
		return this.sendCustomRequestForAnyEditor('deno/performance')
	}
	provideDenoReloadImportRegistries() {
		return this.sendCustomRequestForAnyEditor('deno/reloadImportRegistries')
	}
	provideDenoVirtualTextDocument(textDocumentIdentifier: TextDocumentIdentifier) {
		return this.sendCustomRequestForAnyEditor('deno/virtualTextDocument', {
			textDocument: textDocumentIdentifier
		})
	}
	//custom request extends
	provideDenoCacheAll() {
		const grammarScopes = this.getGrammarScopes()
		return Promise.all(
			atom.workspace.getTextEditors()
			.filter(editor=>grammarScopes.includes(editor.getGrammar().scopeName))
			.map(editor=>this.provideDenoCache(editor))
		)
	}
	provideDenoStatusDocument() {
		return this.provideDenoVirtualTextDocument({uri: 'deno:/status.md'})
	}
	async showDenoStatusDocument() {
		return atom.notifications.addInfo('Deno Language Server', {
			description: await this.provideDenoStatusDocument(),
			dismissable: true,
			icon: 'deno'
		})
	}
}

const denoLS = new DenoLanguageClient()

//config変更時にlspを再起動
//importMap pathの入力途中でfile not foundエラーが出るため、2秒間間引く
let inputTimeoutId: NodeJS.Timeout
atom.config.onDidChange('atom-ide-deno', _=>{
	console.log('atom-ide-deno config change caught')
	clearTimeout(inputTimeoutId)
	inputTimeoutId = setTimeout(_=>{
		denoLS.restartAllServers()
	}, 2000)
})
export default denoLS

/*
virtual documentを表示
*/
atom.workspace.addOpener(filePath=>{
	if (!filePath.startsWith('deno://')) {
		return
	}
	//autoHeightが無いとスクロールバーが出ない
	const editor = new TextEditor({autoHeight: false})
	//言語モードを設定
	atom.grammars.assignLanguageMode(
		editor.getBuffer(),
		atom.grammars.selectGrammar(filePath, ''/*sourceText*/).scopeName
	)
	// デフォルトの表示
	editor.setText('// please wait...\n')
	//読み取り専用
	editor.setReadOnly(true)
	//タブ名
	editor.getTitle = ()=>filePath
	editor.getLongTitle = ()=>filePath
	//保存を無効にする
	// @ts-ignore
	editor.shouldPromptToSave = ()=>false
	//閉じるボタンの表示を調整
	editor.isModified = ()=>false
	editor.getBuffer().isModified = ()=>false
	// defer execution until the content display is complete
	// notice: return value is ignored
	type trapFunctionName = 'setCursorBufferPosition' | 'scrollToBufferPosition'
	const trapFunctions: Array<trapFunctionName> = ['setCursorBufferPosition', 'scrollToBufferPosition']
	const calledArgs: {[P in trapFunctionName]?: any[][]} = {}
	const originalFunctions: {[P in trapFunctionName]?: Function} = {}
	for (const funcName of trapFunctions) {
		calledArgs[funcName] = []
		originalFunctions[funcName] = editor[funcName]
		editor[funcName] = (...args: any[])=>calledArgs[funcName]?.push(args)
	}
	(async _=>{
		const doc = await denoLS.provideDenoVirtualTextDocument({
			uri: filePath.replace('deno://', 'deno:/')
		})
		try {
			await editor.setText(doc, {bypassReadOnly: true})
		} catch {
			editor.setText(`// load was failed. (${filePath.replace('deno://', 'deno:/')})`, {bypassReadOnly: true})
		} finally {
			// execute deferred function
			for (const funcName of trapFunctions) {
				// @ts-ignore
				editor[funcName] = originalFunctions[funcName]
				// @ts-ignore
				calledArgs[funcName].forEach(args=>editor[funcName](...args))
			}
		}
	})()
	return editor
})
