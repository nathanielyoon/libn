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
