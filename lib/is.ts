/** @module is */
/** @internal */
declare const ANY: unique symbol;
type All<A> = A extends { [_: PropertyKey]: unknown }
  ? { [B in keyof A]: All<A[B]> }
  : A;
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
  <const A>(_?: A): <B extends A>($: Is<A, B> extends true ? B : never) => B =>
  <B extends A>($: B) => $;
/** Array type predicate. */
export const isArray = /* @__PURE__ */
  (() => Array.isArray)() as ($: any) => $ is any[] | readonly any[];
/** Object key type predicate. */
export const hasOwn = /* @__PURE__ */ (() => Object.hasOwn)() as <
  A extends PropertyKey,
>($: object, key: A) => $ is { [_ in A]: unknown };
