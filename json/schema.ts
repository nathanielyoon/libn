import type { Merge, Xor } from "./lib.ts";

/** Null schema. */
export type Nil = { type: "null" };
/** Boolean schema. */
export type Bit = Merge<
  & { type: "boolean" }
  & Xor<[{ const: boolean }, { enum: readonly [boolean, ...boolean[]] }, {}]>
>;
/** @internal */
type Numer = Xor<[{ const: number }, { enum: readonly [number, ...number[]] }, {
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
}]>;
/** Integer schema. */
export type Int = Merge<{ type: "integer" } & Numer>;
/** Number schema. */
export type Num = Merge<{ type: "number" } & Numer>;
/** String schema. */
export type Str = Merge<
  & { type: "string" }
  & Xor<[{ const: string }, { enum: readonly [string, ...string[]] }, {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
    format?: "date" | "time" | "date-time" | "email" | "uri" | "uuid";
    contentEncoding?: `base${"16" | "32" | "32hex" | "64" | "64url"}`;
  }]>
>;
/** Array schema. */
export type Arr = Merge<
  & { type: "array"; uniqueItems?: boolean }
  & Xor<[{ items: Schema; minItems?: number; maxItems?: number }, {
    prefixItems: readonly Schema[];
    items: false;
    minItems: number;
    maxItems: number;
  }]>
>;
/** Object schema. */
export type Obj = Merge<
  & { type: "object"; minProperties?: number; maxProperties?: number }
  & Xor<[{ additionalProperties: Schema; propertyKeys?: Str }, {
    properties: { [_: string]: Schema };
    additionalProperties: false;
    required: readonly string[];
  }]>
>;
/** Discriminated union schema. */
export type One = {
  type: "object";
  required: readonly [string];
  oneOf: readonly [
    Omit<Extract<Obj, { properties: {} }>, "type">,
    ...Omit<Extract<Obj, { properties: {} }>, "type">[],
  ];
};
/** JSON schema subset. */
export type Schema = Nil | Bit | Num | Str | Arr | Obj | One;
/** @internal */
type Prefix<
  A extends readonly Schema[],
  B extends number,
  C extends number,
  D extends unknown[] = [],
> = C extends D["length"] ? D
  : A extends readonly [infer E extends Schema, ...infer F extends Schema[]]
    ? Prefix<
      F,
      B,
      C,
      B extends D["length"] ? [...D, Instance<E>?] : [...D, Instance<E>]
    >
  : D;
/** @internal */
type Natural<A extends number> = `${A}` extends `-${string}` ? 0 : A;
/** Typed JSON value. */
export type Instance<A extends Schema> = A extends { const: infer B } ? B
  : A extends { enum: readonly (infer B)[] } ? B
  : A extends Nil ? null
  : A extends Bit ? boolean
  : A extends Num ? number
  : A extends Str ? string
  : A extends Arr ? A extends { items: infer B extends Schema } ? Instance<B>[]
    : A extends {
      prefixItems: infer B extends readonly Schema[];
      minItems: infer C extends number;
      maxItems: infer D extends number;
    } ? Prefix<B, Natural<C>, Natural<D>>
    : never
  : A extends Obj
    ? A extends { additionalProperties: infer B extends Schema }
      ? { [_: string]: Instance<B> }
    : A extends {
      properties: infer B extends { [_: string]: Schema };
      required: readonly (infer C extends string)[];
    } ? Merge<
        & { [D in Extract<keyof B, C>]: Instance<B[D]> }
        & { [D in Exclude<keyof B, C>]?: Instance<B[D]> }
      >
    : never
  : A extends { oneOf: readonly (infer B)[] }
    ? B extends Schema ? Instance<B> : never
  : {};
