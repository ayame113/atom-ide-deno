Translations: [English (en)](https://github.com/ayame113/atom-ide-deno/blob/master/README.md) [日本語 (ja)](https://github.com/ayame113/atom-ide-deno/blob/master/README_ja.md)

# atom-ide-deno

Javascript and TypeScript language support for Atom-IDE, powered by the deno language server.

This is a package produced by the community (not the deno team).

![screen shot](https://raw.githubusercontent.com/ayame113/atom-ide-deno/master/screenshot/1.png)


## How to use

1. install [deno](https://deno.land/) 1.6 or higher
2. install this package
3. install [atom-ide-base](https://atom.io/packages/atom-ide-base) package

> ⚠️ `atom-ide-ui` package was deprecated

> ⚠️ The `atom-ide-javascript` package is for Node.js. It has nothing to do with this extension.

Please see [here](https://atom-community.github.io/) for atom-IDE.

## Installation

Settings > Install > search `atom-ide-deno` > install button

or run the following from the command line,
```
apm install atom-ide-deno
```

## function

Only features available in both the [atom-languageclient implementation list](https://github.com/atom-community/atom-languageclient#capabilities) and the [deno implementation list](https://github.com/denoland/deno/issues/8643#issue-758171107) are available.


## settings

The configuration of the settings is similar to [vscode_deno](https://github.com/denoland/vscode_deno).

 - lsp flags
  - Enables language server: Whether to turn on Language Server
  - Enables code lens implementations: Code lens settings (currently not supported by Atom)
  - Enables code lens references: Code lens settings (currently not supported by Atom)
  - Enables lint: Whether to enable lint
  - Path to import-map: File path to import-map (relative path is resolved based on the project folder)
  - Path to tsconfig: File path to tsconfig (relative path is resolved based on the project folder)
  - Enables unstable: Whether to use unstable APIs for code type checking
 - Deno path: Path to the Deno executable

 ## tips

 ### How to write tsconfig.json to enable dom in lsp
 ```
 {
   "compilerOptions": {
     "allowJs": true,
     "esModuleInterop": true,
     "experimentalDecorators": true,
     "inlineSourceMap": true,
     "isolatedModules": true,
     "jsx": "react",
     "lib": ["deno.window", "dom", "esnext"],
     "module": "esnext",
     "strict": true,
     "target": "esnext",
     "useDefineForClassFields": true
   }
 }
 ```

 ### How to write an importMap that matches the root to the project folder (place it directly under the project folder)
 ```
 {
 	"imports": {
 		"/": "./",
 		"./": "./"
 	}
 }
 ```

 ### Use different settings for each project

Please use external packages such as [project-config](https://atom.io/packages/project-config) and [atomic-management](https://atom.io/packages/atomic-management).

### Debug mode

Open the console with `ctrl-shift-i` and enter the following command.
```
atom.packages.activePackages['atom-ide-deno'].mainModule.isDebug = true
```


 > ⚠️ After editing the importMap or tsconfig, either manually restart the editor or edit the options and restart the LSP.

 ## Contribution

Feel free to contribute.
Feel free to contact us if you would like to take over the development of this package.


 ## License

It is an MIT license.
