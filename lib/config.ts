import type { Disposable } from "atom";

export interface atomConfig {
  [key: string]:
    | configValObj
    | configVal<string>
    | configVal<Integer>
    | configVal<number>
    | configVal<boolean>
    | configVal<Color>
    | configValArray<string>
    | configValArray<Integer>
    | configValArray<number>
    | configValArray<boolean>
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
  radio?: boolean;
}
interface configValObj extends configValBase {
  type: "object";
  properties: atomConfig;
}
interface configVal<T> extends configValBase {
  type: TypeName<T>;
  default: T;
  enum?: T[] | enumContent<T>[];
}
interface configValArray<T> extends configValBase {
  type: "array";
  default: Array<T>;
  items: {
    type: TypeName<T>;
  };
}
type TypeName<T> = T extends string ? "string"
  : T extends Integer ? "integer"
  : T extends number ? "number"
  : T extends boolean ? "boolean"
  : T extends Color ? "color"
  : "never";

interface enumContent<T> {
  value: T;
  description?: string;
}
type Color = string;
type Integer = number;

export const config: atomConfig = {
  modes: {
    title: "Auto config for Deno and Node.js",
    description: `Toggle between Deno mode and Node.js mode with a one click.
      To toggle between modes, click on the part labeled \`Deno\` or \`Node.js\` in the status bar at the bottom.`,
    type: "object",
    order: 1,
    properties: {
      enable: {
        title: "enables",
        description:
          "⚠️Please note that enabling this will automatically rewrite your package settings. If you do not want this behavior, disable it.",
        type: "boolean",
        default: false,
        order: 1,
      },
      currentMode: {
        title: "current mode",
        type: "string",
        default: "deno",
        enum: [
          {
            value: "deno",
            description: "Deno mode",
          },
          {
            value: "node",
            description: "Node.js mode",
          },
        ],
        radio: true,
        order: 2,
      },
      DenoMode: {
        title: "Configuration in *Deno* mode",
        description:
          `You can customize the configuration used when you select Deno mode.
          When you select Deno mode, the following settings apply:
          • Atom-ide-deno (package for Deno runtime): Enable
          • Atom-ide-javascript (package for Node.js runtime): Disable
          • Atom-typescript (package for Node.js runtime): Disable
          • Javascript-drag-import (package for Node.js runtime): Disable`,
        type: "object",
        order: 3,
        properties: {
          linter: {
            title: "Linter",
            description:
              `• \`deno lint\`: Use the built-in linter from the deno language server. Add ESLint to the \`Disabled provider\` setting in the \`Linter\` package.
              • \`eslint\`: Enable the \`linter-eslint\` package if it is installed. Disable the built-in deno linter.
              • \`disable both\`: Disables both \`deno lint\` and \`eslint\`.`,
            type: "string",
            default: "deno lint",
            order: 1,
            enum: ["deno lint", "eslint", "disable both"],
          },
          formatter: {
            title: "Formatter",
            description:
              `• \`deno fmt\`: Use the built-in deno formatter (deno fmt). If the \`prettier-atom\` package is installed, disable it.
              • \`prettier\`: Enable the \`prettier-atom\` package if it is installed. Disables the built-in deno formatter.
              • \`disable both\`: Disable both \`deno fmt\` and \`prettier\`.`,
            type: "string",
            default: "deno fmt",
            order: 2,
            enum: ["deno fmt", "prettier", "disable both"],
          },
        },
      },
      NodeMode: {
        title: "Configuration in *Node.js* mode",
        description:
          `You can customize the configuration used when you select Node.js mode.
        When you select Node.js mode, the following settings apply:
        • Atom-ide-deno (package for Deno runtime): Disable
        • Atom-ide-javascript (package for Node.js runtime): Enable
        • Atom-typescript (package for Node.js runtime): Enable
        • Javascript-drag-import (package for Node.js runtime): Enable`,
        type: "object",
        order: 4,
        properties: {
          linter: {
            title: "Linter",
            description: `Same as above`,
            type: "string",
            default: "eslint",
            order: 1,
            enum: ["deno lint", "eslint", "disable both"],
          },
          formatter: {
            title: "Formatter",
            description: `Same as above`,
            type: "string",
            default: "prettier",
            order: 2,
            enum: ["deno fmt", "prettier", "disable both"],
          },
        },
      },
    },
  },
  lspFlags: {
    title: "lsp flags",
    description:
      "This setting is based on [vscode extention](https://github.com/denoland/vscode_deno)",
    type: "object",
    order: 2,
    properties: {
      enable: {
        title: "Enables language server",
        type: "boolean",
        default: true,
        order: 1,
      },
      lint: {
        title: "Enables lint",
        type: "boolean",
        default: true,
        order: 2,
      },
      unstable: {
        title: "Enables unstable",
        type: "boolean",
        default: false,
        order: 3,
      },
      importMap: {
        title: "Path to import-map",
        description:
          "Relative path from the project root (ex. `./import-map.json`)",
        type: "string",
        default: "",
        order: 4,
      },
      config: {
        title: "Path to tsconfig",
        description:
          "Relative path from the project root (ex. `./tsconfig.json`)",
        type: "string",
        default: "",
        order: 5,
      },
      codeLens: {
        title: "code lens",
        type: "object",
        order: 6,
        properties: {
          implementations: {
            title: "Enables implementations",
            type: "boolean",
            default: true,
            order: 1,
          },
          references: {
            title: "Enables references",
            type: "boolean",
            default: true,
            order: 2,
          },
          referencesAllFunctions: {
            title: "Enables references all functions",
            type: "boolean",
            default: true,
            order: 3,
          },
        },
      },
      suggest: {
        title: "suggest",
        type: "object",
        order: 7,
        properties: {
          autoImports: {
            title: "Enables auto imports",
            type: "boolean",
            default: true,
            order: 1,
          },
          completeFunctionCalls: {
            title: "Enables complete function calls",
            type: "boolean",
            default: true,
            order: 2,
          },
          names: {
            title: "Enables names",
            type: "boolean",
            default: true,
            order: 3,
          },
          paths: {
            title: "Enables paths",
            type: "boolean",
            default: true,
            order: 4,
          },
          imports: {
            title: "imports",
            type: "object",
            order: 5,
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
                order: 1,
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
    order: 3,
    properties: {
      onCommand: {
        title: "Format on command",
        type: "object",
        order: 2,
        properties: {
          excludDir: {
            title: "Excluded directories list when command `Format All File`",
            type: "array",
            order: 1,
            default: ["./node_modules/"],
            items: {
              type: "string",
            },
          },
        },
      },
    },
  },
  advanced: {
    title: "Advanced",
    type: "object",
    order: 4,
    properties: {
      debugMode: {
        title: "debug mode",
        description: "Output log to console (ctrl+shift+i)",
        type: "boolean",
        default: false,
        order: 2,
      },
    },
  },
  path: {
    title: "Deno path",
    description:
      "Path to the deno executable.（ex. `/usr/bin/deno`, `C:\\\\Program Files\\\\deno\\\\deno.exe`）",
    type: "string",
    default: "",
    order: 5,
  },
};

const keyboardInputType = new Set(["string", "integer", "number", "array"]);
/*
キーボード入力のプロパティ一覧
lspの再起動を延期する
returns->[
  ["lspFlags", "importMap"],
  ["lspFlags", "config"],
  ["lspFlags", "suggest", "imports", "hosts"],
  ["format", "onCommand", "excludDir"]
  ["path"]
]
*/
function getKeyboardInputsKeyPath(o: atomConfig) {
  const res: string[][] = [];
  for (const [k, v] of Object.entries(o)) {
    if (keyboardInputType.has(v.type) && !("enum" in v)) {
      res.push([k]);
    } else if (v.type === "object") {
      const r = getKeyboardInputsKeyPath(v.properties);
      res.push(...r.map((v) => [k, ...v]));
    }
  }
  return res;
}

const debounceKeyPathList = getKeyboardInputsKeyPath(config).map(
  (keyPath) => (keyPath.unshift("atom-ide-deno"), keyPath),
);

//config変更時にlspを再起動
//文字列の入力途中でfile not foundエラーが出るため、2秒間間引く
export function debouncedConfigOnDidChange(
  keyPath: string,
  // deno-lint-ignore no-explicit-any
  callback: (values: { newValue: any; oldValue?: any }) => void,
  debounceTime: number,
): Disposable {
  let timeout: NodeJS.Timeout;
  // パスの先頭の`atom-ide-deno`は除外
  const keyPathArray = keyPath.split(".");
  // debounceKeyPathの先頭部分がkeyPathの一部でない場合はスキップ
  const compareKeyPathList = debounceKeyPathList.filter(
    (debounceKeyPath) =>
      keyPathArray.every((key, i) => key === debounceKeyPath[i]),
  ).map((debounceKeyPath) => debounceKeyPath.slice(keyPathArray.length));
  return atom.config.onDidChange(keyPath, ({ newValue, oldValue }) => {
    clearTimeout(timeout);
    const shouldDebounce = compareKeyPathList.some(
      (compareKeyPathList) => {
        // 比較するkeyPathの値を取得
        const newCompareValue = getValueFromKeyPathArray(
          newValue,
          compareKeyPathList,
        );
        const oldCompareValue = getValueFromKeyPathArray(
          oldValue,
          compareKeyPathList,
        );
        // 値が変更されている場合は実行を延期
        if (
          typeof oldCompareValue === "string" &&
          typeof newCompareValue === "string"
        ) {
          return oldCompareValue !== newCompareValue;
        }
        if (
          typeof oldCompareValue === "number" &&
          typeof newCompareValue === "number"
        ) {
          return oldCompareValue !== newCompareValue;
        }
        return JSON.stringify(oldCompareValue) !==
          JSON.stringify(newCompareValue);
      },
    );
    if (shouldDebounce) {
      timeout = setTimeout(() => {
        callback({ oldValue, newValue });
      }, debounceTime);
    } else {
      callback({ oldValue, newValue });
    }
  });
}

function getValueFromKeyPathArray(
  // deno-lint-ignore no-explicit-any
  obj: Record<string, any>,
  keyPathArray: string[],
) {
  return keyPathArray.reduce((target, keyPath) => target?.[keyPath], obj);
}
