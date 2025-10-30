/** JSON value. */
export type Json = null | boolean | number | string | readonly Json[] | {
  [_: string]: Json;
};
/** Condensed object intersection. */
export type Merge<A> = A extends object ? { [B in keyof A]: Merge<A[B]> } : A;
/** Deep non-readonly. */
export type Writable<A> = A extends object
  ? { -readonly [B in keyof A]: Writable<A[B]> }
  : A;
/** Generic constraint against excess properties. */
export type Exact<A, B extends A> =
  & A
  & { [C in keyof B]: C extends keyof A ? B[C] : never };
/** @internal */
type Only<A, B> =
  & A
  & { [C in Exclude<B extends object ? keyof B : never, keyof A>]?: never };
/** Exclusive-or between a list of types. */
export type Xor<A extends unknown[]> = {
  [B in keyof A]: A[B] extends object ? Merge<Only<A[B], A[number]>> : A[B];
}[number];
/** Union to intersection. */
export type And<A> = (A extends never ? never : (_: A) => void) extends
  (_: infer B) => void ? B : never;
/** Union to tuple. */
export type Tuple<A> = And<A extends never ? never : (_: A) => A> extends
  ((_: never) => infer B extends A) ? [...Tuple<Exclude<A, B>>, B] : [];
/** Object keys. */
export type Keys<A> = Tuple<`${Exclude<keyof A, symbol>}`>;
/** Fixed-length array. */
export type Sequence<A, B extends number, C extends A[] = []> = B extends B
  ? C["length"] extends B ? C : Sequence<A, B, [...C, A]>
  : never;
/** Array type predicate. */
export const isArray = /* @__PURE__ */
  Array.isArray as ($: any) => $ is any[] | readonly any[];
/** Object key type predicate. */
export const hasOwn = /* @__PURE__ */ Object.hasOwn as <A extends PropertyKey>(
  $: object,
  key: A,
) => $ is { [_ in A]: unknown };
