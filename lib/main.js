const {AutoLanguageClient, Convert} = require('atom-languageclient')
const cp = require('child_process')

const getDenoPath = _=>atom.config.get('atom-ide-deno.path')||'deno'

let isDebug = false

class DenoLanguageClient extends AutoLanguageClient {
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
			//'source.md', <-is supported??
		]
	}
	getLanguageName () { return 'JavaScript' }
	getServerName () { return 'deno-language-server' }
	getInitializeParams(...args) {
		const initializationOptions = atom.config.get('atom-ide-deno.lspFlags')
		//filter empty string
		initializationOptions.importMap = initializationOptions.importMap||void 0
		initializationOptions.config = initializationOptions.config||void 0
		//suggest.imports.hosts の入力はArrayだが、渡すときにObjectに変換する必要がある
		//https://github.com/denoland/vscode_deno/blob/main/docs/ImportCompletions.md
		try {
			initializationOptions.suggest.imports.hosts = Object.fromEntries(initializationOptions.suggest.imports.hosts.map(v=>[v, true]))
		} catch(e) {console.log(e)}
		if (this.isDebug) {console.log(initializationOptions)}
		//https://github.com/denoland/deno/pull/8850
		//enableフラグが必要
		return Object.assign(
			super.getInitializeParams(...args),
			{initializationOptions}
		)
	}
	restartAllServers(...args) {
		console.log('restart Deno Language server')
		atom.notifications.addInfo('restart Deno Language server')
		return super.restartAllServers(...args)
	}
	getSuggestionDetailsOnSelect(suggestion, ...args) {
		//insertTextFormat==2の場合、スニペットとして解釈される
		//スニペット用のテキストがlspから提供されてないので、通常の補完として利用する
		if (this.isDebug) {console.log(suggestion)}
		if (suggestion.snippet==='') {
			suggestion.snippet = void 0
		}
		return super.getSuggestionDetailsOnSelect(suggestion, ...args)
	}
	async getDefinition(...args) {
		const res = await super.getDefinition(...args)
		if (this.isDebug) {console.log(res)}
		if (res==null) {return null}
		const {definitions, ...others} = res
		// `deno:/` から始まるカスタムリクエストは相対パスとして解釈されてしまう
		// `deno://` に置換して返す
		return {
			definitions: definitions.map(d=>{
				if (!d.path) {return d}
				if (typeof d.path!='string' && !(d.path instanceof String)) {return d}
				if (!d.path.startsWith('deno:/') || d.path.startsWith('deno://')) {return d}
				d.path = d.path.replace('deno:/', 'deno://')
				return d
			}),
			...others
		}
	}
	startServerProcess(_projectPath) {
		console.log('Starting deno language server')
		if (!this.isDebug) {
			return cp.spawn(getDenoPath(), ['lsp'], {env: process.env})
		} else {
			const formatData = data=>data.toString().split('\n').map(v=>{
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
			return childProcess
		}
	}
	//custom request util
	getCurrentConnection() {
		return this.getConnectionForEditor(atom.workspace.getActiveTextEditor())
	}
	async getAnyConnection() {
		const activeServers = this._serverManager.getActiveServers()
		if (activeServers.length) {
			return activeServers[0].connection
		}
		//activeServerが空の場合、仮のconnectionを用意
		if (!this._emptyConnection) {
			this._emptyConnection = (await this.startServer('')).connection
			return this._emptyConnection
		}
		return this._emptyConnection
	}
	async sendCustomRequestForCurrentEditor(...args) {
		return (await this.getCurrentConnection()).sendCustomRequest(...args)
	}
	async sendCustomRequestForAnyEditor(...args) {
		return (await this.getAnyConnection()).sendCustomRequest(...args)
	}
	//custom request
	provideDenoCache(textEditor) {
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
	provideDenoVirtualTextDocument(TextDocumentIdentifier) {
		return this.sendCustomRequestForAnyEditor('deno/virtualTextDocument', {
			textDocument: TextDocumentIdentifier
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
let inputTimeoutId
atom.config.onDidChange('atom-ide-deno', _=>{
	console.log('atom-ide-deno config change caught')
	clearTimeout(inputTimeoutId)
	inputTimeoutId = setTimeout(_=>{
		denoLS.restartAllServers()
	}, 2000)
})
module.exports = denoLS

/*
virtual documentを表示
*/
const {TextEditor} = require('atom')
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
	editor.getTitle = _=>filePath
	editor.getLongTitle = _=>filePath
	//保存を無効にする
	editor.shouldPromptToSave = _=>false
	//閉じるボタンの表示を調整
	editor.isModified = _=>false
	editor.getBuffer().isModified = _=>false
	// defer execution until the content display is complete
	// notice: return value is ignored
	const trapFunctions = ['setCursorBufferPosition', 'scrollToBufferPosition']
	const calledArgs = {}
	const originalFunctions = {}
	for (const funcName of trapFunctions) {
		calledArgs[funcName] = []
		originalFunctions[funcName] = editor[funcName]
		editor[funcName] = (...args)=>calledArgs[funcName].push(args)
	}
	(async _=>{
		const doc = await denoLS.provideDenoVirtualTextDocument({
			uri: filePath.replace('deno://', 'deno:/')
		})
		try {
			await editor.setText(doc, {bypassReadOnly: true})
			// execute deferred function
			for (const funcName of trapFunctions) {
				editor[funcName] = originalFunctions[funcName]
				calledArgs[funcName].forEach(args=>editor[funcName](...args))
			}
		} catch {
			editor.setText(`// load was failed. (${filePath.replace('deno://', 'deno:/')})`, {bypassReadOnly: true})
		}
	})()
	return editor
})
