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
/** Resolves to `true` if the types are exactly equal, and `false` otherwise. */
export type Is<A, B> = [A, B] extends [never, never] ? true : Are<An<A>, An<B>>;
/** Checks the type of a value and returns it. */
export const is =
  <const A>(_?: A): <B extends A>($: Is<A, B> extends true ? B : never) => B =>
  <B extends A>($: B) => $;
/** Checks that something is an array (or `readonly` array). */
export const isArray = /* @__PURE__ */
  (() => Array.isArray)() as ($: any) => $ is any[] | readonly any[];
/** Checks that something is an object. */
export const isObject = ($: any): $ is { [_: PropertyKey]: unknown } =>
  typeof $ === "object" && $ !== null && !isArray($);
/** Checks that an object has a property. */
export const hasOwn = /* @__PURE__ */ (() => Object.hasOwn)() as <
  A extends PropertyKey,
>($: object, key: A) => $ is { [_ in A]: unknown };
