/*import { createPlugins } from "rollup-plugin-atomic"

const plugins = createPlugins(["ts", "js"])

export default [
  {
    input: "src/main.ts",
    output: [
      {
        dir: "dist",
        format: "cjs",
        sourcemap: true,
      },
    ],
    // loaded externally
    external: ["atom"],
    plugins: plugins,
  },
]*/
/*
import { createPlugins } from "rollup-plugin-atomic"

const plugins = createPlugins([["ts", { tsconfig: "./src/tsconfig.json" }, true], "js", "json"])

const RollupConfig = [
  {
    input: "src/main.ts",
    output: [
      {
        dir: "dist",
        format: "cjs",
        sourcemap: true,
      },
    ],
    // loaded externally
    external: ["atom"],
    plugins,
  },
]
export default RollupConfig*/
import rollupTypescript from '@rollup/plugin-typescript'
export default {
  input: 'src/main.ts',
  output: {
    dir: "dist",
    format: "cjs",
    sourcemap: true,
  },
  plugins: [
    rollupTypescript({'tsconfig': 'src/tsconfig.json', target: "esnext"})
  ]
};