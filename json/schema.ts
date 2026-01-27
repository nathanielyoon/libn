/** @module */
/** JSON value. */
export type Json = null | boolean | number | string | readonly Json[] | {
  [_: string]: Json;
};
type Merge<A> = A extends object ? { [B in keyof A]: A[B] } : A;

/** @internal */
export interface Nil {
  oneOf: readonly [{ type: "null" }, Exclude<Schema, Nil>];
}
/** @internal */
export interface Opt {
  enum: readonly [boolean | number | string, ...(boolean | number | string)[]];
}
/** @internal */
export interface Bit {
  type: "boolean";
}
/** @internal */
export interface Num {
  type: "number";
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
}
/** @internal */
export interface Int {
  type: "integer";
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
}
/** @internal */
export interface Str {
  type: "string";
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?:
    | "date"
    | "time"
    | "date-time"
    | "duration"
    | "email"
    | "uri"
    | "uuid";
  contentEncoding?: `base${"16" | "32" | "32hex" | "64" | "64url"}`;
}
/** @internal */
export interface Arr {
  type: "array";
  items: Schema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
}
/** @internal */
export interface Rec {
  type: "object";
  additionalProperties: Schema;
  propertyNames?: Str;
  minProperties?: number;
  maxProperties?: number;
}
/** @internal */
export interface Obj {
  type: "object";
  properties: { [_: string]: Schema };
  required: readonly string[];
  additionalProperties: false;
  minProperties?: number;
  maxProperties?: number;
}
/** JSON schema. */
export type Schema = Nil | Opt | Bit | Int | Num | Str | Arr | Rec | Obj;
/** JSON instance. */
export type Instance<A extends Schema> = Schema extends A ? Json
  : A extends { oneOf: readonly [{ type: "null" }, infer B extends Schema] }
    ? null | Instance<B>
  : A extends {
    properties: infer B extends { [_: string]: Schema };
    required: readonly (infer C extends string)[];
  } ? Merge<
      & { [D in Extract<`${Exclude<keyof B, symbol>}`, C>]: Instance<B[D]> }
      & { [D in Exclude<`${Exclude<keyof B, symbol>}`, C>]?: Instance<B[D]> }
    >
  : A extends { additionalProperties: infer B extends Schema }
    ? { [_: string]: Instance<B> }
  : A extends { items: infer B extends Schema } ? readonly Instance<B>[]
  : A extends { enum: readonly (infer B)[] } ? B
  : A extends { type: "string" } ? string
  : A extends { type: "number" } ? number
  : A extends { type: "integer" } ? number
  : A extends { type: "boolean" } ? boolean
  : never;
