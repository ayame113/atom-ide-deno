import * as Atom from "atom";
import type { IdeUri } from "atom-ide-base/types-packages/uri";

export interface CallHierarchyProvider {
  name: string;
  priority: number;
  grammarScopes: ReadonlyArray<string>;
  getIncomingCallHierarchy(
    editor: Atom.TextEditor,
    point: Atom.Point,
  ): Promise<CallHierarchy<"incoming"> | null>;
  getOutgoingCallHierarchy(
    editor: Atom.TextEditor,
    point: Atom.Point,
  ): Promise<CallHierarchy<"outgoing"> | null>;
}

interface CallHierarchy<T extends "incoming" | "outgoing"> {
  type: T;
  data: CallHierarchyItem[];
  itemAt(i: number): Promise<CallHierarchy<T>>;
}

interface CallHierarchyItem {
  path: IdeUri;
  name: string;
  icon: string | null;
  //tags?: SymbolTag[]; <- isDeprecated=1
  detail?: string;
  range: Atom.Range;
  selectionRange: Atom.Range;
}
