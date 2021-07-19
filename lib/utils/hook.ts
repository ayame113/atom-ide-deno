/** Hook the argument value with {argumentsHook} and the return value with {returnHook} for the {property} of {target}. */
export function addHookToObject<
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
export function addHook<A extends Array<any>, R>(
  originalFunction: (...args: A) => R,
  {
    argumentsHook,
    returnHook,
  }: FunctionHooks<A, R>,
  thisArg?: any,
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
