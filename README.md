# atom-deno-lsp

Javascript and TypeScript language support for Atom-IDE, powered by the deno language server.

## Requirements

You must have [deno](https://deno.land/) 1.6.0 or higher to use this extension.

## Feature

This extension provides the minimum functionality to use the deno language server with the Atom-IDE.

### Support

 - Linter
 - Complement

deno lsp seems to be working now. Features may be added as the development of deno lsp progresses.

### Not supported

 - Formatter
 - Debugger
 - `deno cache` command

Further investigation is required for implementation.

## Contribution

This extension is a minimal implementation. If you add an implementation, you need to find out whether the feature should be implemented on the lsp side or in this package. (formatter etc.)

I tried [xatom-debug-nodejs](https://github.com/xatom-plugins/xatom-debug-nodejs) to implement the debugger, but it didn't work.

Another way to implement the debugger, [atom-ide-javascript](https://github.com/atom-community/atom-ide-javascript), seems to call the vscode extension inside. Theoretically, I only need to rewrite `node --inspect-brk` to` deno run --inspect-brk`, but I have to deal with the difference in how typescript is executed. Further investigation is needed.

Feel free to contribute.
Feel free to contact us if you would like to take over the development of this package.


## License

It is an MIT license.
