import type { Logger } from "atom-languageclient";

class CustomLogger implements Logger {
  #shouldOutput = false;
  /**
   * usage:
   * ```
   * atom.config.observe("packageName.debugMode", logger.observer)
   * ```
   */
  observer = (newValue: boolean) => {
    // 矢印関数なのでthisをbindする必要が無い
    this.#shouldOutput = newValue;
  };
  warn(...args: unknown[]) {
    if (this.#shouldOutput) {
      console.warn(...args);
    }
  }
  error(...args: unknown[]) {
    if (this.#shouldOutput) {
      console.error(...args);
    }
  }
  info(...args: unknown[]) {
    if (this.#shouldOutput) {
      console.info(...args);
    }
  }
  log(...args: unknown[]) {
    if (this.#shouldOutput) {
      console.log(...args);
    }
  }
  debug(...args: unknown[]) {
    if (this.#shouldOutput) {
      console.debug(...args);
    }
  }
}
export const logger = new CustomLogger();
