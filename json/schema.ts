import type { Json, Merge, Writable, Xor } from "./lib.ts";

/** Null schema. */
export type Nil =
  | { type: "null" }
  | { type: ["null", "boolean"]; oneOf: [{ type: "null" }, Bit] }
  | { type: ["null", "integer"]; oneOf: [{ type: "null" }, Int] }
  | { type: ["null", "number"]; oneOf: [{ type: "null" }, Num] }
  | { type: ["null", "string"]; oneOf: [{ type: "null" }, Str] }
  | { type: ["null", "array"]; oneOf: [{ type: "null" }, Arr] }
  | { type: ["null", "object"]; oneOf: [{ type: "null" }, Obj] };
/** Boolean schema. */
export type Bit =
  & { type: "boolean" }
  & Xor<[{ const: boolean }, { enum: readonly [boolean, ...boolean[]] }, {}]>;
/** @internal */
type Numer = Xor<[{ const: number }, { enum: readonly [number, ...number[]] }, {
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
}]>;
/** Integer schema. */
export type Int = { type: "integer" } & Numer;
/** Number schema. */
export type Num = { type: "number" } & Numer;
/** String schema. */
export type Str =
  & { type: "string" }
  & Xor<[{ const: string }, { enum: readonly [string, ...string[]] }, {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    format?: "date" | "time" | "date-time" | "email" | "uri" | "uuid";
    contentEncoding?: `base${"16" | "32" | "32hex" | "64" | "64url"}`;
  }]>;
/** Array schema. */
export type Arr =
  & { type: "array"; uniqueItems?: boolean }
  & Xor<[
    { items: Schema; minItems?: number; maxItems?: number },
    { prefixItems: readonly Schema[]; items: false; minItems: number },
  ]>;
/** Object schema. */
export type Obj =
  & { type: "object"; minProperties?: number; maxProperties?: number }
  & Xor<[{ additionalProperties: Schema; propertyNames?: Str }, {
    properties: { [_: string]: Schema };
    additionalProperties: false;
    required: readonly string[];
  }, {
    required: readonly [string];
    oneOf: readonly [
      Extract<Obj, { properties: {} }>,
      ...Extract<Obj, { properties: {} }>[],
    ];
  }]>;
/** JSON schema subset. */
export type Schema = Nil | Bit | Int | Num | Str | Arr | Obj;
/** @internal */
type Prefix<
  A extends readonly Schema[],
  B extends number,
  D extends unknown[] = [],
> = A extends readonly [infer E extends Schema, ...infer F extends Schema[]]
  ? Prefix<
    F,
    B,
    B extends D["length"] ? [...D, Instance<E>?] : [...D, Instance<E>]
  >
  : D;
/** @internal */
type Natural<A extends number> = `${A}` extends `-${string}` ? 0 : A;
/** Typed JSON value. */
export type Instance<A extends Schema> = Schema extends A ? Json
  : A extends { const: infer B } ? B
  : A extends { enum: readonly (infer B)[] } ? B
  : A extends { oneOf: [Nil, infer B extends Schema] } ? null | Instance<B>
  : A["type"] extends "null" ? null
  : A["type"] extends "boolean" ? boolean
  : A["type"] extends "integer" | "number" ? number
  : A["type"] extends "string" ? string
  : A["type"] extends "array"
    ? A extends { items: infer B extends Schema } ? readonly Instance<B>[]
    : A extends {
      prefixItems: infer B extends readonly Schema[];
      minItems: infer C extends number;
    } ? Prefix<B, Natural<C>>
    : never
  : A extends { additionalProperties: infer B extends Schema }
    ? { [_: string]: Instance<B> }
  : A extends {
    properties: infer B extends { [_: string]: Schema };
    required: readonly (infer C extends string)[];
  } ? Writable<
      & { [D in Extract<keyof B, C>]: Instance<B[D]> }
      & { [D in Exclude<keyof B, C>]?: Instance<B[D]> }
    >
  : A extends
    { required: readonly [infer B extends string]; oneOf: readonly (infer C)[] }
    ? C extends Schema
      ? Instance<C> extends infer D extends { [_ in B]?: Json }
        ? Merge<Omit<D, B> & { [E in B]: Exclude<D[E], undefined> }>
      : never
    : never
  : never;
