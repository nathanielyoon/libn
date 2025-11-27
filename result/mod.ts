/** @internal */
type Union = { [_: string]: unknown };
/** Success or tagged failure. */
export type Result<A = any, B extends Union = Union, C extends string = never> =
  | { error: null; value: A }
  | { [D in keyof B]: { error: `${Exclude<D, symbol>}`; value: B[D] } }[keyof B]
  | (C extends never ? never : { error: C; value: Error });
/** @internal */
declare const KEY: unique symbol;
/** @internal */
type Key<A extends Union> = symbol & { [KEY]: A };
/** Creates a unique symbol associated with an error union. */
export const define: <A extends Union = {}>(description?: string) => Key<A> =
  Symbol as any;
const use = (key: symbol) => (error: string, value: unknown) => {
  throw { [key]: { error, value } };
};
const unwrap = (key: symbol, $: any, or?: string) => {
  if (Object.hasOwn($ ?? {}, key)) return $[key];
  if (or !== undefined && $ instanceof Error) return { error: or, value: $ };
  throw $;
};
type No<A extends Union> = <B extends keyof A>(
  state: `${Exclude<B, symbol>}`,
  value: A[B],
) => never;
/** Wraps an unsafe function in a `Result`. */
export const wrap = <A, B extends Union, C extends string = never>(
  key: Key<B>,
  unsafe: (no: No<B>) => A,
  or?: C,
): Result<A, B, C> => {
  try {
    return { error: null, value: unsafe(use(key)) };
  } catch (thrown) {
    return unwrap(key, thrown, or);
  }
};
/** Wraps an unsafe async function in a promised `Result`. */
export const wait = async <A, B extends Union, C extends string = never>(
  key: Key<B>,
  unsafe: (no: No<B>) => A | Promise<A>,
  or?: C,
): Promise<Result<A, B, C>> => {
  try {
    return { error: null, value: await unsafe(use(key)) };
  } catch (thrown) {
    return unwrap(key, thrown, or);
  }
};
