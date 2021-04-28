export interface atomConfig {
  [key: string]:
    | configValObj
    | configVal<String>
    | configVal<Integer>
    | configVal<Number>
    | configVal<Boolean>
    | configVal<Color>
    | configValArray<String>
    | configValArray<Integer>
    | configValArray<Number>
    | configValArray<Boolean>
    | configValArray<Color>;
}

interface configValBase {
  title: string;
  description?: string;
  type:
    | "object"
    | "array"
    | "string"
    | "integer"
    | "number"
    | "boolean"
    | "color"
    | "never";
  order: number;
}
interface configValObj extends configValBase {
  type: "object";
  properties: atomConfig;
}
interface configVal<T> extends configValBase {
  type: TypeName<T>;
  default: T;
}
interface configValArray<T> extends configValBase {
  type: "array";
  default: Array<T>;
  items: {
    type: TypeName<T>;
  };
}
type TypeName<T> = T extends String ? "string"
  : T extends Integer ? "integer"
  : T extends Number ? "number"
  : T extends Boolean ? "boolean"
  : T extends Color ? "color"
  : "never";
type Color = String;
type Integer = Number;

export const config: atomConfig = {
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
  format: {
    title: "Format options",
    type: "object",
    order: 10,
    properties: {
      onSave: {
        title: "Format on save",
        type: "object",
        order: 11,
        properties: {
          enable: {
            title: "enables",
            type: "boolean",
            default: true,
            order: 11,
          },
          extensions: {
            title: "File type to enable",
            type: "object",
            order: 12,
            properties: {
              "source_js": {
                title: "JavaScript",
                type: "boolean",
                default: true,
                order: 13,
              },
              "source_ts": {
                title: "TypeScript",
                type: "boolean",
                default: true,
                order: 14,
              },
              "source_gfm": {
                title: "markdown",
                type: "boolean",
                default: true,
                order: 15,
              },
              "source_json": {
                title: "json",
                type: "boolean",
                default: true,
                order: 16,
              },
            },
          },
        },
      },
      onCommand: {
        title: "Format on command",
        type: "object",
        order: 17,
        properties: {
          excludDir: {
            title: "Excluded directories list when command `Format All File`",
            type: "array",
            order: 18,
            default: ["./node_modules/"],
            items: {
              type: "string",
            },
          },
        },
      },
    },
  },
  path: {
    title: "Deno path",
    description:
      "Path to the deno executable.（ex. `/usr/bin/deno`, `C:\\\\Program Files\\\\deno\\\\deno.exe`）",
    type: "string",
    default: "",
    order: 19,
  },
  debugMode: {
    title: "debug mode",
    description: "Output log to console (ctrl+shift+i)",
    type: "boolean",
    default: false,
    order: 20,
  },
};
