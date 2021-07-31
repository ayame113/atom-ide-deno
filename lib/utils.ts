export const getDenoPath = (): string =>
  atom.config.get("atom-ide-deno.path") || "deno";

export function trapMethod<
  T extends string,
  // deno-lint-ignore no-explicit-any
  U extends { [key in T]: (...arg: any[]) => Promise<any> | void },
>(
  target: U,
  prop: T,
) {
  let shouldTrap = true;
  const originalFunction = target[prop];
  const argsQue: {
    args: Parameters<U[T]>;
    resolve: (value: unknown) => void;
  }[] = [];
  target[prop] = <U[T]> function (...args: Parameters<U[T]>) {
    if (!shouldTrap) {
      return originalFunction.apply(target, args);
    }
    return new Promise((resolve) => {
      argsQue.push({ args, resolve });
    });
  };
  return {
    endTrap() {
      shouldTrap = false;
      for (const { args, resolve } of argsQue) {
        resolve(originalFunction.apply(target, args));
      }
    },
  };
}

/** Hook the argument value with {argumentsHook} and the return value with {returnHook} for the {property} of {target}. */
export function addHookToObject<
  // deno-lint-ignore no-explicit-any
  A extends Array<any>,
  R,
  P extends string | number | symbol,
  T extends {
    [k in P]: (...args: A) => R;
  },
>(
  target: T,
  property: P,
  {
    argumentsHook,
    returnHook,
  }: FunctionHooks<A, R>,
) {
  target[property] = <T[P]> addHook(
    target[property],
    { argumentsHook, returnHook },
    target,
  );
}

/** Hook the argument value with {argumentsHook} and the return value with {returnHook} for the {originalFunction}. The value of {thisArg} is set to {this} of the {originalFunction}. */
// deno-lint-ignore no-explicit-any
export function addHook<A extends Array<any>, R>(
  originalFunction: (...args: A) => R,
  {
    argumentsHook,
    returnHook,
  }: FunctionHooks<A, R>,
  thisArg?: unknown,
): (...args: A) => R {
  return ((...args: A) => {
    const newArgs = argumentsHook ? argumentsHook(args) : args;
    const returns = originalFunction.apply(thisArg, newArgs);
    return returnHook ? returnHook(returns) : returns;
  });
}

export interface FunctionHooks<A, R> {
  argumentsHook?: (arg: A) => A;
  returnHook?: (arg: R) => R;
}
