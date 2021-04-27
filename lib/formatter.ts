// using custom formatter
// atom-ide-ui(old package) has meny bug at formatting.
import cp from "child_process";

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
): Promise<{ stdout: string; stderr: string }> {
  const commandOption = ["fmt", ...options, filePath];
  console.log("env: ", process.env);
  console.log(denoPath, ...commandOption);
  return new Promise((resolve) => {
    cp.execFile(denoPath, commandOption, {
      env: process.env,
    }, (_error, stdout, stderr) => {
      console.log(stderr);
      console.log(stdout);
      resolve({ stdout, stderr });
    });
  });
}
