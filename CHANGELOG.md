## 1.2.0
 - supports "Go to Definition"
![using go to definition](/screenshot/goToDefinition.gif "using go to definition")
 - add hosts that support import completion to the default settings
 - Preparing commands for custom request
   - For developers: You can try a custom request by opening a console with `ctrl-shift-i` and typing the following command:

```js
await atom.packages.activePackages["atom-ide-deno"].mainModule.provideDenoCache()
await atom.packages.activePackages["atom-ide-deno"].mainModule.provideDenoCacheAll()
await atom.packages.activePackages["atom-ide-deno"].mainModule.provideDenoPerformance()
await atom.packages.activePackages["atom-ide-deno"].mainModule.provideDenoReloadImportRegistries()
await atom.packages.activePackages["atom-ide-deno"].mainModule.showDenoStatusDocument()
await atom.packages.activePackages["atom-ide-deno"].mainModule.provideDenoVirtualTextDocument({uri: 'deno:/status.md'})
```

## 1.1.0
 - supports Import Completions

## 1.0.0
 - supports importMap
 - supports tsconfig
 - supports executable path

## 0.1.2 - First Release
 - the minimum functionality to use the deno language server with the Atom-IDE.
