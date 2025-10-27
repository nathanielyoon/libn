import type { Join } from "./lib.ts";

/** Null schema. */
export type Nil = { type: "null" };
/** Boolean schema. */
export type Bit = {
  type: "boolean";
  const?: boolean;
  enum?: readonly [boolean, ...boolean[]];
};
/** Number (or integer) schema. */
export type Num = {
  type: "integer" | "number";
  const?: number;
  enum?: readonly [number, ...number[]];
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
};
/** String schema. */
export type Str = {
  type: "string";
  const?: string;
  enum?: readonly [string, ...string[]];
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: "date" | "time" | "date-time" | "email" | "uri" | "uuid";
  contentEncoding?: `base${"16" | "32" | "32hex" | "64" | "64url"}`;
};
/** Array schema. */
export type Arr = {
  type: "array";
  items: Schema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
};
/** Object schema. */
export type Obj = {
  type: "object";
  properties: { [_: string]: Schema };
  required: readonly string[];
  additionalProperties: false;
  minProperties?: number;
  maxProperties?: number;
};
/** @internal */
type Subarray<A> = A extends [infer B, ...infer C]
  ? [...B extends C[number] ? [] : [] | [B], ...Subarray<C>]
  : A;
/** Union schema. */
export type One = {
  // These have to be in an arbitrary order, or the union's size explodes to
  // about 2000 members.
  oneOf: Exclude<Subarray<[Nil, Bit, Num, Str, Arr, Obj]>, []>;
};
/** JSON schema subset. */
export type Schema = Nil | Bit | Num | Str | Arr | Obj | One;
/** Typed JSON value. */
export type Instance<A extends Schema> = A extends
  { oneOf: readonly (infer B extends Schema)[] } ? Instance<B>
  : A extends {
    properties: infer B extends { [_: string]: Schema };
    required: readonly (infer C)[];
  } ? Join<
      & { [D in Extract<keyof B, C>]: Instance<B[D]> }
      & { [D in Exclude<keyof B, C>]?: Instance<B[D]> }
    >
  : A extends { items: infer B extends Schema } ? readonly Instance<B>[]
  : A extends Nil ? null
  : A extends { const: infer B } ? B
  : A extends { enum: readonly (infer B)[] } ? B
  : A extends Bit ? boolean
  : A extends Str ? string
  : A extends Num ? number
  : never;
