/** JSON value. */
export type Json = null | boolean | number | string | readonly Json[] | {
  [_: string]: Json;
};
/** Condensed object intersection. */
export type Merge<A> = A extends object ? { [B in keyof A]: A[B] } : A;
/** Union to intersection. */
export type And<A> = (A extends never ? never : (_: A) => void) extends
  (_: infer B) => void ? B : never;
/** Union to tuple. */
export type Tuple<A> = And<A extends never ? never : (_: A) => A> extends
  ((_: never) => infer B extends A) ? [...Tuple<Exclude<A, B>>, B] : [];
/** Whether two types are mutually assignable. */
export type Are<A, B> = [A, B] extends [B, A] ? true : false;
/** @internal */
type Exact<A, B> = Are<
  <C>(_: A) => C extends A & C | C ? true : false,
  <C>(_: B) => C extends B & C | C ? true : false
>;
/** @internal */
type Delve<A> = A extends { [_: PropertyKey]: unknown }
  ? { [B in keyof A]: Delve<A[B]> }
  : A;
/** Whether two types are exactly equal. */
export type Is<A, B> = [A, B] extends [never, never] ? true
  : [false, false] extends [true & A, true & B] ? true
  : Exact<Delve<A>, Delve<B>>;
/** Checks the type of a value and returns it. */
export const type =
  <const A>(_?: A): <B extends A>($: Is<A, B> extends true ? B : never) => B =>
  <B extends A>($: B) => $;
