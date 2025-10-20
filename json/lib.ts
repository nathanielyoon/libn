/** JSON value. */
export type Json = null | boolean | number | string | readonly Json[] | {
  [_: string]: Json;
};
/** Condensed object intersection. */
export type Join<A> = A extends object ? { [B in keyof A]: A[B] } : A;
type Only<A, B> =
  & A
  & { [C in Exclude<B extends object ? keyof B : never, keyof A>]?: never };
/** Exclusive-or between a list of types. */
export type Xor<A extends unknown[]> = {
  [B in keyof A]: A[B] extends object ? Join<Only<A[B], A[number]>> : A[B];
}[number];
/** Union to intersection. */
export type And<A> = (A extends never ? never : (_: A) => void) extends
  (_: infer B) => void ? B : never;
/** Union to tuple. */
export type Tuple<A> = And<A extends never ? never : (_: A) => A> extends
  ((_: never) => infer B extends A) ? [...Tuple<Exclude<A, B>>, B] : [];
/** Array type predicate. */
export const isArray = /* @__PURE__ */
  Array.isArray as ($: any) => $ is any[] | readonly any[];
/** Non-null JSON types. */
export interface Type {
  boolean: boolean;
  integer: number;
  number: number;
  string: string;
  array: Json[] | readonly Json[];
  object: { [_: string]: Json };
}
/** Type-specific constraints. */
export interface Meta {
  boolean: {};
  number: {
    minimum?: number;
    maximum?: number;
    exclusiveMinimum?: number;
    exclusiveMaximum?: number;
    multipleOf?: number;
  };
  string: { minLength?: number; maxLength?: number; pattern?: string };
  array: { minItems?: number; maxItems?: number };
  object: { minProperties?: number; maxProperties?: number };
}
