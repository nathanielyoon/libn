/** Success or tagged failure. */
export type Result<A, B extends { [_: PropertyKey]: unknown }> =
  | { error: null; value: A }
  | { [D in keyof B]: { error: D; value: B[D] } }[keyof B];
/** @internal */
declare const KEY: unique symbol;
/** @internal */
type Key<A extends { [_: PropertyKey]: unknown }> = symbol & { [KEY]: A };
/** Creates a unique symbol associated with an error union. */
export const define: <A extends { [_: PropertyKey]: unknown } = {}>(
  description?: string,
) => Key<A> = Symbol as any;
type Sync<A, B extends { [_: PropertyKey]: unknown }> = A extends A
  ? A extends Promise<infer C> ? Promise<Result<C, B>> : Result<A, B>
  : never;
function no(this: symbol, error: PropertyKey, value: unknown): never {
  throw { [this]: { error, value } };
}
function or(this: symbol, result: any, map?: { [_: PropertyKey]: any }) {
  if (result.error === null) return result.value;
  const mapper = map?.[result.error];
  if (mapper) return mapper(result.value);
  throw { [this]: result };
}
function open(this: symbol, value: any) {
  if (Object.hasOwn(value ?? {}, this)) return value[this];
  throw value;
}
/** Wraps throws in a `Result`. */
export const wrap = <A, B extends { [_: PropertyKey]: unknown }>(
  key: Key<B>,
  unsafe: (no: <C extends keyof B>(error: C, value: B[C]) => never, or: {
    <C>(result: Result<C, B>): C;
    <C, D extends { [_: PropertyKey]: unknown }, E>(
      result: Result<C, D>,
      map:
        & { [F in Exclude<keyof D, keyof B>]: (value: D[F]) => E }
        & { [F in Extract<keyof D, keyof B>]?: (value: D[F]) => E },
    ): C | E;
  }) => A,
): Sync<A, B> => {
  try {
    const value = unsafe(no.bind(key), or.bind(key));
    return (value instanceof Promise
      ? value.then(($) => ({ error: null, value: $ })).catch(open.bind(key))
      : { error: null, value }) as Sync<A, B>;
  } catch (value) {
    return open.call(key, value);
  }
};
function pass(this: PropertyKey, value: unknown) {
  if (value instanceof Error) return { error: this, value };
  throw value;
}
/** Wraps an unsafe function. */
export const trap = <A extends unknown[], B, C extends PropertyKey = "error">(
  unsafe: (...$: A) => B,
  error?: C,
): (...$: A) => Sync<B, { [_ in C]: Error }> =>
(...$) => {
  try {
    const value = unsafe(...$);
    return (value instanceof Promise
      ? value.then(($) => ({ error: null, value: $ })).catch(
        pass.bind(error! ?? "error"),
      )
      : { error: null, value }) as Sync<B, { [_ in C]: Error }>;
  } catch (value) {
    return pass.call(error! ?? "error", value) as Sync<B, { [_ in C]: Error }>;
  }
};
