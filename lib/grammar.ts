function addGrammar(scope: string, fileType: string) {
  const grammar = atom.grammars.grammarForScopeName(scope);
  if (!grammar) {
    return false;
  }
  // @ts-ignore
  if (grammar.fileTypes.includes(fileType)) {
    return false;
  }
  // @ts-ignore
  grammar.fileTypes.push(fileType);
  return true;
}

export function activate() {
  try {
    const isUpdateds = [
      addGrammar("source.json", "jsonc"),
      addGrammar("source.js", "mjs"),
      addGrammar("source.js", "cjs"),
      addGrammar("source.ts", "mts"),
      addGrammar("source.ts", "cts"),
    ];
    if (isUpdateds.some((v) => v)) {
      // @ts-ignore
      atom.grammars.grammarAddedOrUpdated(
        atom.grammars.grammarForScopeName("source.json")!,
      );
      // @ts-ignore
      atom.grammars.grammarAddedOrUpdated(
        atom.grammars.grammarForScopeName("source.js")!,
      );
      // @ts-ignore
      atom.grammars.grammarAddedOrUpdated(
        atom.grammars.grammarForScopeName("source.ts")!,
      );
    }
  } catch (e) {
    console.warn(e);
  }
}
