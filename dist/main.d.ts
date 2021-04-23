/// <reference types="node" />
import { AutoLanguageClient } from 'atom-languageclient';
import type { LanguageServerProcess, LanguageClientConnection } from 'atom-languageclient';
import type { Point } from "atom";
import { TextEditor } from "atom";
import type { TextDocumentIdentifier } from "vscode-languageserver-protocol";
import cp from 'child_process';
declare class DenoLanguageClient extends AutoLanguageClient {
    _emptyConnection: LanguageClientConnection;
    get isDebug(): boolean;
    set isDebug(v: boolean);
    getGrammarScopes(): string[];
    getLanguageName(): string;
    getServerName(): string;
    getInitializeParams(...args: [string, LanguageServerProcess]): import("vscode-languageserver-protocol")._InitializeParams & import("vscode-languageserver-protocol/lib/common/protocol.workspaceFolders").WorkspaceFoldersInitializeParams & {
        initializationOptions: any;
    };
    restartAllServers(...args: []): Promise<void>;
    getDefinition(...args: [TextEditor, Point]): Promise<{
        queryRange: readonly import("atom").Range[] | null | undefined;
        definitions: import("atom-ide-base").Definition[];
    } | null>;
    startServerProcess(_projectPath: string): cp.ChildProcessWithoutNullStreams;
    getCurrentConnection(): Promise<LanguageClientConnection | null>;
    getAnyConnection(): Promise<import("atom-languageclient/lib/languageclient").LanguageClientConnection | LanguageClientConnection>;
    sendCustomRequestForCurrentEditor(method: string, params?: any[] | object): Promise<any>;
    sendCustomRequestForAnyEditor(method: string, params?: any[] | object): Promise<any>;
    provideDenoCache(textEditor: TextEditor): Promise<any>;
    provideDenoPerformance(): Promise<any>;
    provideDenoReloadImportRegistries(): Promise<any>;
    provideDenoVirtualTextDocument(textDocumentIdentifier: TextDocumentIdentifier): Promise<any>;
    provideDenoCacheAll(): Promise<any[]>;
    provideDenoStatusDocument(): Promise<any>;
    showDenoStatusDocument(): Promise<import("atom").Notification>;
}
declare const denoLS: DenoLanguageClient;
export default denoLS;
