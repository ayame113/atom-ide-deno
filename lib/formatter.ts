// using custom formatter
import cp from "child_process";

import { logger } from "./logger";

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
