import { CompositeDisposable } from "atom";
import cp from "child_process";

import { logger } from "./logger";
import { getDenoPath } from "./utils";

export function cacheFile(
  denoPath: string,
  options: string[],
  filePath: string,
): Promise<{ error: Error | null; stdout: string; stderr: string }> {
  const commandOption = ["cache", ...options, filePath];
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

export function observeOnSaveCache(): CompositeDisposable {
  // save on cache
  const disposable = new CompositeDisposable();
  disposable.add(
    atom.workspace.observeTextEditors((editor) => {
      const onDidSave = editor.onDidSave(({ path }) => {
        if (!atom.config.get("atom-ide-deno.cache.onSave.enable")) {
          logger.log(`ignored cache(disabled): ${path}`);
          return;
        }
        logger.log(`format: ${path}`);
        cacheFile(getDenoPath(), [], path);
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
