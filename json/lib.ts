import type { Merge } from "@libn/types";

/** Non-readonly. */
export type Writable<A> = A extends object ? { -readonly [B in keyof A]: A[B] }
  : A;
/** Generic constraint against excess properties. */
export type Only<A, B extends A> =
  & A
  & { [C in keyof B]: C extends keyof A ? B[C] : never };
/** @internal */
type Take<A, B> = Merge<
  & A
  & { [C in Exclude<B extends object ? keyof B : never, keyof A>]?: never }
>;
/** Exclusive-or between a list of types. */
export type Xor<A extends unknown[]> = {
  [B in keyof A]: A[B] extends object ? Take<A[B], A[number]> : A[B];
}[number];
/** Array type predicate. */
export const isArray = /* @__PURE__ */
  (() => Array.isArray)() as ($: any) => $ is any[] | readonly any[];
/** Object key type predicate. */
export const hasOwn = /* @__PURE__ */ (() => Object.hasOwn)() as <
  A extends PropertyKey,
>($: object, key: A) => $ is { [_ in A]: unknown };
