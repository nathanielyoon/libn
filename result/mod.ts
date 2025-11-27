/** @internal */
type Union = { [_: PropertyKey]: unknown };
/** Success or tagged failure. */
export type Result<A = any, B extends Union = Union, C extends string = never> =
  | { error: null; value: A }
  | { [D in keyof B]: { error: D; value: B[D] } }[keyof B]
  | (C extends never ? never : { error: C; value: Error });
/** @internal */
declare const KEY: unique symbol;
type Key<A extends Union> = symbol & { [KEY]: A };
/** Creates a unique symbol associated with an error union. */
export const define: <A extends Union = {}>(description?: string) => Key<A> =
  Symbol as any;
function no(this: symbol, error: PropertyKey, value: unknown): never {
  throw { [this]: { error, value } };
}
const unwrap = (key: symbol, $: any, or?: string) => {
  if (Object.hasOwn($ ?? {}, key)) return $[key];
  if (or !== undefined && $ instanceof Error) return { error: or, value: $ };
  throw $;
};
/** Wraps an unsafe function in a `Result`. */
export const wrap = <A, B extends Union, C extends string = never>(
  key: Key<B>,
  unsafe: (no: <C extends keyof B>(error: C, value: B[C]) => never) => A,
  or?: C,
): Result<A, B, C> => {
  try {
    return { error: null, value: unsafe(no.bind(key)) };
  } catch (thrown) {
    return unwrap(key, thrown, or);
  }
};
/** Wraps an unsafe async function in a promised `Result`. */
export const wait = async <A, B extends Union, C extends string = never>(
  key: Key<B>,
  unsafe: (no: <C extends keyof B>(error: C, value: B[C]) => never) => A,
  or?: C,
): Promise<Result<Awaited<A>, B, C>> => {
  try {
    return { error: null, value: await unsafe(no.bind(key)) };
  } catch (thrown) {
    return unwrap(key, thrown, or);
  }
};
