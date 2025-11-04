import { assertEquals } from "@std/assert";

/** JSON value. */
export type Json = null | boolean | number | string | readonly Json[] | {
  [_: string]: Json;
};
/** Composite type. */
export type Objecty = { [_: PropertyKey]: unknown };
/** Condensed object intersection. */
export type Merge<A> = A extends Objecty ? { [B in keyof A]: A[B] } : A;
/** Non-readonly. */
export type Writable<A> = A extends Objecty ? { -readonly [B in keyof A]: A[B] }
  : A;
/** Generic constraint against excess properties. */
export type Exact<A, B extends A> =
  & A
  & { [C in keyof B]: C extends keyof A ? B[C] : never };
/** @internal */
type Only<A, B> = Merge<
  & A
  & { [C in Exclude<B extends Objecty ? keyof B : never, keyof A>]?: never }
>;
/** Exclusive-or between a list of types. */
export type Xor<A extends unknown[]> = {
  [B in keyof A]: A[B] extends Objecty ? Only<A[B], A[number]> : A[B];
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
  (() => Array.isArray)() as ($: any) => $ is any[] | readonly any[];
/** Object key type predicate. */
export const hasOwn = /* @__PURE__ */ (() => Object.hasOwn)() as <
  A extends PropertyKey,
>($: object, key: A) => $ is { [_ in A]: unknown };
type All<A> = A extends Objecty ? { [B in keyof A]: All<A[B]> } : A;
declare const ANY: unique symbol;
type Any<A> = false extends (true & A) ? typeof ANY : All<A>;
type Both<A, B> = A extends B ? B extends A ? true : false : false;
type Is<A, B> = Both<
  <C>(_: A) => C extends A & C | C ? true : false,
  <C>(_: B) => C extends B & C | C ? true : false
>;
/** Checks that two types are equal. */
export type IsExact<A, B> = [A, B] extends [never, never] ? true
  : [A & B] extends [never] ? false
  : Is<Any<A>, Any<B>>;
/** Checks the type of a value and returns it, optionally asserting equality. */
export const type = <A>(
  ...expected: [A?]
): <B extends A>(actual: IsExact<A, B> extends true ? B : never) => B =>
<B extends A>(actual: B) => {
  if (expected.length) assertEquals<A | undefined>(actual, expected[0]);
  return actual;
};
