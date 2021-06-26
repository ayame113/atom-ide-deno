import Convert from "atom-languageclient/build/lib/convert";
import * as Utils from "atom-languageclient/build/lib/utils";
import type { CancellationTokenSource } from "vscode-jsonrpc";
import type {
  LanguageClientConnection,
  ServerCapabilities,
} from "atom-languageclient/lib/languageclient";
import type { Point, TextEditor } from "atom";

import OutlineViewAdapter from "atom-languageclient/build/lib/adapters/outline-view-adapter";

import * as lsp from "vscode-languageserver-protocol";
import type {
  CallHierarchy,
  CallHierarchyItem,
  CallHierarchyType,
} from "./call-hierarchy";

/** Public: Adapts the documentSymbolProvider of the language server to the Outline View supplied by Atom IDE UI. */
export default class CallHierarchyAdapter {
  private _cancellationTokens: WeakMap<
    LanguageClientConnection,
    CancellationTokenSource
  > = new WeakMap();

  /**
   * Public: Determine whether this adapter can be used to adapt a language server based on the serverCapabilities
   * matrix containing a callHierarchyProvider.
   *
   * @param serverCapabilities The {ServerCapabilities} of the language server to consider.
   * @returns A {Boolean} indicating adapter can adapt the server based on the given serverCapabilities.
   */
  public static canAdapt(serverCapabilities: ServerCapabilities): boolean {
    return !!serverCapabilities.callHierarchyProvider;
  }

  async getCallHierarchy<T extends CallHierarchyType>(
    connection: LanguageClientConnection,
    editor: TextEditor,
    point: Point,
    type: T,
  ): Promise<CallHierarchyWithAdapter<T>> {
    const requestParam: lsp.CallHierarchyPrepareParams = {
      textDocument: Convert.editorToTextDocumentIdentifier(editor),
      position: Convert.pointToPosition(point),
    };
    const results = await Utils.doWithCancellationToken(
      connection,
      this._cancellationTokens,
      (_cancellationToken) =>
        //ignore private
        // @ts-ignore
        connection._sendRequest(
          lsp.CallHierarchyPrepareRequest.type,
          requestParam,
        ),
    );
    return {
      type,
      data: results?.map?.(parseCallHierarchyItem) ?? [],
      itemAt(n: number): Promise<CallHierarchy<T>> {
        if (type === "incoming") {
          return this.adapter.getIncoming(
            this.connection,
            this.data[n].rawData,
          ) as Promise<CallHierarchy<T>>;
        } else {
          return this.adapter.getOutgoing(
            this.connection,
            this.data[n].rawData,
          ) as Promise<CallHierarchy<T>>;
        }
      },
      connection,
      adapter: this,
    } as CallHierarchyWithAdapter<T>;
  }
  async getIncoming(
    connection: LanguageClientConnection,
    item: lsp.CallHierarchyItem,
  ): Promise<CallHierarchy<"incoming">> {
    const requestParam: lsp.CallHierarchyIncomingCallsParams = { item };
    const results = await Utils.doWithCancellationToken(
      connection,
      this._cancellationTokens,
      (_cancellationToken) =>
        //ignore private
        // @ts-ignore
        connection._sendRequest(
          lsp.CallHierarchyIncomingCallsRequest.type,
          requestParam,
        ),
    );
    return {
      type: "incoming",
      data: results?.map?.((l) => parseCallHierarchyItem(l.from)) || [],
      itemAt(n: number) {
        return this.adapter.getIncoming(this.connection, this.data[n].rawData);
      },
      connection,
      adapter: this,
    } as CallHierarchyWithAdapter<"incoming">;
  }
  async getOutgoing(
    connection: LanguageClientConnection,
    item: lsp.CallHierarchyItem,
  ): Promise<CallHierarchy<"outgoing">> {
    const requestParam: lsp.CallHierarchyOutgoingCallsParams = { item };
    const results = await Utils.doWithCancellationToken(
      connection,
      this._cancellationTokens,
      (_cancellationToken) =>
        //ignore private
        // @ts-ignore
        connection._sendRequest(
          lsp.CallHierarchyOutgoingCallsRequest.type,
          requestParam,
        ),
    );
    return {
      type: "outgoing",
      data: results?.map?.((l) => parseCallHierarchyItem(l.to)) || [],
      itemAt(n: number) {
        return this.adapter.getOutgoing(this.connection, this.data[n].rawData);
      },
      connection,
      adapter: this,
    } as CallHierarchyWithAdapter<"outgoing">;
  }
}

function parseCallHierarchyItem(
  rawData: lsp.CallHierarchyItem,
): CallHierarchyItemWithAdapter {
  return {
    path: Convert.uriToPath(rawData.uri),
    name: rawData.name,
    icon: OutlineViewAdapter.symbolKindToEntityKind(rawData.kind),
    //tags?: SymbolTag[]; <- isDeprecated?1:0
    detail: rawData.detail,
    range: Convert.lsRangeToAtomRange(rawData.range),
    selectionRange: Convert.lsRangeToAtomRange(rawData.selectionRange),
    rawData,
  };
}

interface CallHierarchyWithAdapter<T extends CallHierarchyType>
  extends CallHierarchy<T> {
  data: CallHierarchyItemWithAdapter[];
  adapter: CallHierarchyAdapter;
  connection: LanguageClientConnection;
}

interface CallHierarchyItemWithAdapter extends CallHierarchyItem {
  rawData: lsp.CallHierarchyItem;
}
