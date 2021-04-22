'use strict';

Object.defineProperty(exports, "__esModule", { value: true });
const tslib_1 = require("tslib");
const atom_languageclient_1 = require("atom-languageclient");
const atom_1 = require("atom");
const child_process_1 = tslib_1.__importDefault(require("child_process"));
const getDenoPath = () => atom.config.get('atom-ide-deno.path') || 'deno';
let isDebug = false;
class DenoLanguageClient extends atom_languageclient_1.AutoLanguageClient {
    get isDebug() { return isDebug; }
    set isDebug(v) {
        isDebug = v;
        this.restartAllServers();
    }
    getGrammarScopes() {
        return [
            'source.js',
            'source.jsx',
            'source.ts',
            'source.tsx',
            'JavaScript',
            'TypeScript',
            'source.json',
        ];
    }
    getLanguageName() { return 'JavaScript'; }
    getServerName() { return 'deno-language-server'; }
    getInitializeParams(...args) {
        const initializationOptions = atom.config.get('atom-ide-deno.lspFlags');
        initializationOptions.importMap = initializationOptions.importMap || void 0;
        initializationOptions.config = initializationOptions.config || void 0;
        try {
            initializationOptions.suggest.imports.hosts = Object.fromEntries(initializationOptions.suggest.imports.hosts.map((v) => [v, true]));
        }
        catch (e) {
            console.log(e);
        }
        if (this.isDebug) {
            console.log(initializationOptions);
        }
        return Object.assign(super.getInitializeParams(...args), { initializationOptions });
    }
    restartAllServers(...args) {
        console.log('restart Deno Language server');
        atom.notifications.addInfo('restart Deno Language server');
        return super.restartAllServers(...args);
    }
    async getDefinition(...args) {
        const res = await super.getDefinition(...args);
        if (this.isDebug) {
            console.log(res);
        }
        if (res == null) {
            return null;
        }
        const { definitions, ...others } = res;
        return {
            definitions: definitions.map(d => {
                if (!d.path) {
                    return d;
                }
                if (typeof d.path != 'string') {
                    return d;
                }
                if (!d.path.startsWith('deno:/') || d.path.startsWith('deno://')) {
                    return d;
                }
                d.path = d.path.replace('deno:/', 'deno://');
                return d;
            }),
            ...others
        };
    }
    startServerProcess(_projectPath) {
        console.log('Starting deno language server');
        return child_process_1.default.spawn(getDenoPath(), ['lsp'], { env: process.env });
    }
    getCurrentConnection() {
        const currentEditor = atom.workspace.getActiveTextEditor();
        if (currentEditor) {
            return this.getConnectionForEditor(currentEditor);
        }
        else {
            return Promise.resolve(null);
        }
    }
    async getAnyConnection() {
        const activeServers = this._serverManager.getActiveServers();
        if (activeServers.length) {
            return activeServers[0].connection;
        }
        if (!this._emptyConnection) {
            this._emptyConnection = (await this.startServer('')).connection;
            return this._emptyConnection;
        }
        return this._emptyConnection;
    }
    async sendCustomRequestForCurrentEditor(method, params) {
        return (await this.getCurrentConnection())?.sendCustomRequest(method, params);
    }
    async sendCustomRequestForAnyEditor(method, params) {
        return (await this.getAnyConnection()).sendCustomRequest(method, params);
    }
    provideDenoCache(textEditor) {
        return this.sendCustomRequestForCurrentEditor('deno/cache', {
            referrer: atom_languageclient_1.Convert.editorToTextDocumentIdentifier(textEditor || atom.workspace.getActiveTextEditor()),
            uris: []
        });
    }
    provideDenoPerformance() {
        return this.sendCustomRequestForAnyEditor('deno/performance');
    }
    provideDenoReloadImportRegistries() {
        return this.sendCustomRequestForAnyEditor('deno/reloadImportRegistries');
    }
    provideDenoVirtualTextDocument(textDocumentIdentifier) {
        return this.sendCustomRequestForAnyEditor('deno/virtualTextDocument', {
            textDocument: textDocumentIdentifier
        });
    }
    provideDenoCacheAll() {
        const grammarScopes = this.getGrammarScopes();
        return Promise.all(atom.workspace.getTextEditors()
            .filter(editor => grammarScopes.includes(editor.getGrammar().scopeName))
            .map(editor => this.provideDenoCache(editor)));
    }
    provideDenoStatusDocument() {
        return this.provideDenoVirtualTextDocument({ uri: 'deno:/status.md' });
    }
    async showDenoStatusDocument() {
        return atom.notifications.addInfo('Deno Language Server', {
            description: await this.provideDenoStatusDocument(),
            dismissable: true,
            icon: 'deno'
        });
    }
}
const denoLS = new DenoLanguageClient();
let inputTimeoutId;
atom.config.onDidChange('atom-ide-deno', _ => {
    console.log('atom-ide-deno config change caught');
    clearTimeout(inputTimeoutId);
    inputTimeoutId = setTimeout(_ => {
        denoLS.restartAllServers();
    }, 2000);
});
exports.default = denoLS;
atom.workspace.addOpener(filePath => {
    if (!filePath.startsWith('deno://')) {
        return;
    }
    const editor = new atom_1.TextEditor({ autoHeight: false });
    atom.grammars.assignLanguageMode(editor.getBuffer(), atom.grammars.selectGrammar(filePath, '').scopeName);
    editor.setText('// please wait...\n');
    editor.setReadOnly(true);
    editor.getTitle = () => filePath;
    editor.getLongTitle = () => filePath;
    editor.shouldPromptToSave = () => false;
    editor.isModified = () => false;
    editor.getBuffer().isModified = () => false;
    const trapFunctions = ['setCursorBufferPosition', 'scrollToBufferPosition'];
    const calledArgs = {};
    const originalFunctions = {};
    for (const funcName of trapFunctions) {
        calledArgs[funcName] = [];
        originalFunctions[funcName] = editor[funcName];
        editor[funcName] = (...args) => calledArgs[funcName]?.push(args);
    }
    (async (_) => {
        const doc = await denoLS.provideDenoVirtualTextDocument({
            uri: filePath.replace('deno://', 'deno:/')
        });
        try {
            await editor.setText(doc, { bypassReadOnly: true });
        }
        catch {
            editor.setText(`// load was failed. (${filePath.replace('deno://', 'deno:/')})`, { bypassReadOnly: true });
        }
        finally {
            for (const funcName of trapFunctions) {
                editor[funcName] = originalFunctions[funcName];
                calledArgs[funcName].forEach(args => editor[funcName](...args));
            }
        }
    })();
    return editor;
});
//# sourceMappingURL=main.js.map
