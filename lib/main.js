const {AutoLanguageClient} = require('atom-languageclient')
const cp = require('child_process')

const debug = false

class DenoLanguageClient extends AutoLanguageClient {
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
		//https://github.com/denoland/deno/pull/8850
		//enableフラグが必要
		return {
			...super.getInitializeParams(...args),
			initializationOptions: {
				enable: true
			}
		}
	}
	getSuggestionDetailsOnSelect(suggestion, ...args) {
		//insertTextFormat==2の場合、スニペットとして解釈される
		//スニペット用のテキストがlspから提供されてないので、通常の補完として利用する
		if (debug) {console.log(suggestion)}
		if (suggestion.snippet==='') {
			suggestion.snippet = void 0
		}
		return super.getSuggestionDetailsOnSelect(suggestion, ...args)
	}
	startServerProcess(projectPath) {
		console.log("Starting deno language server")
		if (!debug) {
			return cp.spawn('deno', ['lsp'], {env: process.env})
		} else {
			const formatData = data=>data.toString().split('\n').map(v=>{
				try {return JSON.parse(v)}
				catch (e) {return v}
			})
			const env = process.env
			console.log(env)
			const childProcess = cp.spawn('deno', ['lsp', '--unstable'], {
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

module.exports = new DenoLanguageClient()
