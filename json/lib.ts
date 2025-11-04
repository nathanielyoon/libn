/** @module lib */
/** JSON value. */
export type Json = null | boolean | number | string | readonly Json[] | {
  [_: string]: Json;
};
type All<A> = A extends { [_: PropertyKey]: unknown }
  ? { [B in keyof A]: All<A[B]> }
  : A;
/** @internal */
declare const ANY: unique symbol;
/** @internal */
type An<A> = false extends (true & A) ? typeof ANY : All<A>;
type Both<A, B> = [A] extends [B] ? [B] extends [A] ? true : false : false;
/** @internal */
type Are<A, B> = Both<
  <C>(_: A) => C extends A & C | C ? true : false,
  <C>(_: B) => C extends B & C | C ? true : false
>;
/** Checks that two types are equal. */
export type Is<A, B> = [A, B] extends [never, never] ? true : Are<An<A>, An<B>>;
/** Checks the type of a value and returns it. */
export const type =
  <A>(_?: A): <B extends A>(value: Is<A, B> extends true ? B : never) => B =>
  <B extends A>(value: B) => value;
/** Condensed object intersection. */
export type Merge<A> = A extends object ? { [B in keyof A]: A[B] } : A;
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
/** Union to intersection. */
export type And<A> = (A extends never ? never : (_: A) => void) extends
  (_: infer B) => void ? B : never;
/** Union to tuple. */
export type Tuple<A> = And<A extends never ? never : (_: A) => A> extends
  ((_: never) => infer B extends A) ? [...Tuple<Exclude<A, B>>, B] : [];
/** Array type predicate. */
export const isArray = /* @__PURE__ */
  (() => Array.isArray)() as ($: any) => $ is any[] | readonly any[];
/** Object key type predicate. */
export const hasOwn = /* @__PURE__ */ (() => Object.hasOwn)() as <
  A extends PropertyKey,
>($: object, key: A) => $ is { [_ in A]: unknown };
