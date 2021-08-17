// using custom formatter
import { CompositeDisposable } from "atom";
import cp from "child_process";

import { logger } from "./logger";
import { getDenoPath } from "./utils";

export const options = {
  check: "--check",
  ext: {
    ts: "--ext ts",
    tsx: "--ext tsx",
    js: "--ext js",
    jsx: "--ext jsx",
    md: "--ext md",
    json: "--ext json",
    jsonc: "--ext jsonc",
  },
  help: "--help",
  ignore: (ignore: string[]) => `--ignore=${ignore.join(",")}`,
  logLevel: {
    debug: "--log-level debug",
    info: "--log-level info",
  },
  quiet: "--quiet",
  unstable: "--unstable",
  watch: "--watch",
};

export function formatFile(
  denoPath: string,
  options: string[],
  filePath: string,
): Promise<{ error: Error | null; stdout: string; stderr: string }> {
  const commandOption = ["fmt", ...options, filePath];
  logger.log("env: ", process.env);
  logger.log(denoPath, ...commandOption);
  return new Promise((resolve) => {
    cp.execFile(denoPath, commandOption, {
      env: process.env,
    }, (error, stdout, stderr) => {
      logger.log({ error, stdout, stderr });
      resolve({ error, stdout, stderr });
    });
  });
}

export function observeOnSaveFormatter(): CompositeDisposable {
  // save on format
  const disposable = new CompositeDisposable();
  disposable.add(
    atom.workspace.observeTextEditors((editor) => {
      const onDidSave = editor.onDidSave(({ path }) => {
        if (!atom.config.get("atom-ide-deno.format.onSave.enable")) {
          logger.log(`ignored format(disabled): ${path}`);
          return;
        }
        if (
          !atom.config.get(
            `atom-ide-deno.format.onSave.extensions.${
              editor.getGrammar().scopeName.replace(/\./g, "_")
            }`,
          )
        ) {
          logger.log(`ignored format(exclude extension): ${path}`);
          return;
        }
        logger.log(`format: ${path}`);
        formatFile(getDenoPath(), [], path);
      });
      disposable.add(
        editor.onDidDestroy(() => {
          onDidSave.dispose();
        }),
        onDidSave,
      );
    }),
  );
  return disposable;
}
