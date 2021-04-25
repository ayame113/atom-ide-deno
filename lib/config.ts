export const config = {
  lspFlags: {
    title: "lsp flags",
    description:
      "This setting is based on [vscode extention](https://github.com/denoland/vscode_deno)",
    type: "object",
    order: 1,
    properties: {
      enable: {
        title: "Enables language server",
        type: "boolean",
        default: true,
        order: 2,
      },
      lint: {
        title: "Enables lint",
        type: "boolean",
        default: true,
        order: 3,
      },
      unstable: {
        title: "Enables unstable",
        type: "boolean",
        default: false,
        order: 4,
      },
      importMap: {
        title: "Path to import-map",
        description:
          "Relative path from the project root (ex. `./import-map.json`)",
        type: "string",
        default: "",
        order: 5,
      },
      config: {
        title: "Path to tsconfig",
        description:
          "Relative path from the project root (ex. `./tsconfig.json`)",
        type: "string",
        default: "",
        order: 6,
      },
      codeLens: {
        title: "code lens",
        type: "object",
        order: 7,
        properties: {
          implementations: {
            title: "Enables implementations",
            type: "boolean",
            default: true,
            order: 8,
          },
          references: {
            title: "Enables references",
            type: "boolean",
            default: true,
            order: 9,
          },
          referencesAllFunctions: {
            title: "Enables references all functions",
            type: "boolean",
            default: true,
            order: 10,
          },
        },
      },
      suggest: {
        title: "suggest",
        type: "object",
        order: 11,
        properties: {
          autoImports: {
            title: "Enables auto imports",
            type: "boolean",
            default: true,
            order: 12,
          },
          completeFunctionCalls: {
            title: "Enables complete function calls",
            type: "boolean",
            default: true,
            order: 13,
          },
          names: {
            title: "Enables names",
            type: "boolean",
            default: true,
            order: 14,
          },
          paths: {
            title: "Enables paths",
            type: "boolean",
            default: true,
            order: 15,
          },
          imports: {
            title: "imports",
            type: "object",
            order: 16,
            properties: {
              hosts: {
                title: "List of hosts",
                description:
                  "Controls which hosts are enabled for import suggestions. See [vscode's document](https://github.com/denoland/vscode_deno/blob/main/docs/ImportCompletions.md)",
                type: "array",
                default: [
                  "https://deno.land/",
                  "https://x.nest.land/",
                  "https://envoy.now.sh/",
                ],
                order: 17,
                items: {
                  type: "string",
                },
              },
            },
          },
        },
      },
    },
  },
  path: {
    title: "Deno path",
    description:
      "Path to the deno executable.（ex. `/usr/bin/deno`, `C:\\Program Files\\deno\\deno.exe`）",
    type: "string",
    default: "",
    order: 10,
  },
};
