/** Union to intersection. */
export type Intersect<A> = (A extends never ? never : (_: A) => void) extends
  (_: infer B) => void ? B : never;
/** Union to tuple. */
export type Tuple<A extends string> = string extends A ? string[]
  : Intersect<A extends never ? never : (_: A) => A> extends
    ((_: never) => infer B extends A) ? [...Tuple<Exclude<A, B>>, B]
  : [];
/** Valid JSON. */
export type Json =
  | (null | boolean | number | string)
  | (Json[] | readonly Json[] | { [_: string]: Json });
/** Non-empty array. */
export type Some<A = unknown> = [A, ...A[]];
