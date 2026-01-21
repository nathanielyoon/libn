/** Error union. */
export type Union = { [_: PropertyKey]: unknown };
/** Success or tagged failure. */
export type Result<A = any, B extends Union = Union> =
  | { error: null; value: A }
  | { [C in keyof B]: { error: C; value: B[C] } }[keyof B];

/** @internal */
type Key<A extends Union> = symbol & { [B in keyof A]: A[B] };
/** Creates a unique symbol associated with an error union. */
export const as: <A extends Union = {}>() => Key<A> = Symbol as any;

function no(this: symbol, error: PropertyKey, value: unknown): never {
  throw Object.defineProperty({}, this, { value: { error, value } });
}
type No<A extends Union> = <B extends keyof A>(error: B, value: A[B]) => never;
/** Creates a result synchronously. */
export const wrap = <A, B extends Union>(
  key: Key<B>,
  use: (no: No<B>) => A,
): Result<A, B> => {
  try {
    return { error: null, value: use(no.bind(key)) };
  } catch (value) {
    if (Object.hasOwn(value ?? {}, key)) return (value as any)[key];
    throw value;
  }
};
/** Creates a result asynchronously. */
export const wait = async <A, B extends Union>(
  key: Key<B>,
  use: (no: No<B>) => A,
): Promise<Result<Awaited<A>, B>> => {
  try {
    return { error: null, value: await use(no.bind(key)) };
  } catch (value) {
    if (Object.hasOwn(value ?? {}, key)) return (value as any)[key];
    throw value;
  }
};
/** Catches errors thrown from an unsafe function. */
export const seal = <A extends unknown[], B, C extends PropertyKey = "Error">(
  unsafe: (...$: A) => B,
  error?: C,
): (...$: A) => Result<B, { [_ in C]: Error }> =>
(...$) => {
  try {
    return { error: null, value: unsafe(...$) };
  } catch (value) {
    if (value instanceof Error) return { error: error! ?? "Error", value };
    throw value;
  }
};
