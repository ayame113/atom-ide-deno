const {AutoLanguageClient} = require('atom-languageclient')
const cp = require('child_process')

const denoPath = atom.config.get('atom-ide-deno.path')||'deno'

class DenoLanguageClient extends AutoLanguageClient {
	// TODO setterを付けてdebug時に再起動
	isDebug = false
	getGrammarScopes () {
		return [
			'source.js',
			'source.jsx',
			'source.ts',
			'source.tsx',
			'JavaScript',
			'TypeScript',
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
	getSuggestionDetailsOnSelect(suggestion, ...args) {
		//insertTextFormat==2の場合、スニペットとして解釈される
		//スニペット用のテキストがlspから提供されてないので、通常の補完として利用する
		if (this.isDebug) {console.log(suggestion)}
		if (suggestion.snippet==='') {
			suggestion.snippet = void 0
		}
		return super.getSuggestionDetailsOnSelect(suggestion, ...args)
	}
	startServerProcess(_projectPath) {
		console.log('Starting deno language server')
		if (!this.isDebug) {
			return cp.spawn(denoPath, ['lsp'], {env: process.env})
		} else {
			const formatData = data=>data.toString().split('\n').map(v=>{
				try {return JSON.parse(v)}
				catch (_) {return v}
			})
			const env = process.env
			console.log(env)
			const childProcess = cp.spawn(denoPath, ['lsp'], {
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
}

const denoLC = new DenoLanguageClient()

//config変更時にlspを再起動
//importMap pathの入力途中でfile not foundエラーが出るため、2秒間間引く
let inputTimeoutId
atom.config.onDidChange('atom-ide-deno.lspFlags', _=>{
	console.log('atom-ide-deno.lspFlags change caught')
	clearTimeout(inputTimeoutId)
	inputTimeoutId = setTimeout(_=>{
		console.log('restart Deno Language server')
		atom.notifications.addInfo('restart Deno Language server')
		denoLC.restartAllServers()
	}, 2000)
})
module.exports = denoLC
