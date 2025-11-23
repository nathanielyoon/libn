/** @module */
/** @internal */
import type { Json, Merge, Tuple } from "@libn/types";
import { isArray, type Only, type Writable, type Xor } from "./lib.ts";

/** Null or nullable schema. */
export type Nil =
  | { type: "null" }
  | (Bit | Int | Num | Str | Arr | Obj extends infer A
    ? A extends { type: infer B }
      ? { type: ["null", B]; oneOf: [{ type: "null" }, A] }
    : never
    : never);
/** @internal */
type Primitive<A, B, C> =
  & { type: A }
  & Xor<[{ const: B }, { enum: readonly [B, ...B[]] }, C]>;
/** @internal */
interface Numeric {
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
}
/** @internal */
interface Stringy {
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: "date" | "time" | "date-time" | "email" | "uri" | "uuid";
  contentEncoding?: `base${"16" | "32" | "32hex" | "64" | "64url"}`;
}
/** Boolean schema. */
export type Bit = Primitive<"boolean", boolean, {}>;
/** Integer schema. */
export type Int = Primitive<"integer", number, Numeric>;
/** Number schema. */
export type Num = Primitive<"number", number, Numeric>;
/** String schema. */
export type Str = Primitive<"string", string, Stringy>;
/** Array schema. */
export type Arr =
  & { type: "array"; uniqueItems?: boolean }
  & Xor<[
    { items: Schema; minItems?: number; maxItems?: number },
    { prefixItems: readonly Schema[]; items: false; minItems: number },
  ]>;
/** Object schema. */
export type Obj =
  & { type: "object" }
  & Xor<[{
    additionalProperties: Schema;
    propertyNames?: Str;
    minProperties?: number;
    maxProperties?: number;
  }, {
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
      & { [D in Extract<`${Exclude<keyof B, symbol>}`, C>]: Instance<B[D]> }
      & { [D in Exclude<`${Exclude<keyof B, symbol>}`, C>]?: Instance<B[D]> }
    >
  : A extends
    { required: readonly [infer B extends string]; oneOf: readonly (infer C)[] }
    ? C extends Schema
      ? Instance<C> extends infer D extends { [_ in B]?: Json }
        ? Merge<Omit<D, B> & { [E in B]: Exclude<D[E], undefined> }>
      : never
    : never
  : never;
/** Creates a null schema. */
export const nil = (($?: Schema) => (
  $
    ? { type: ["null", $.type], oneOf: [nil(), structuredClone($)] }
    : { type: "null" }
)) as {
  (): { type: "null" };
  <const A extends Schema>(
    $: A,
  ): { type: ["null", A["type"]]; oneOf: [{ type: "null" }, A] };
};
const typer = (type: string, $?: any) => ($ === undefined ? { type } : {
  ...typeof $ !== "object" ? { const: $ } : isArray($) ? { enum: [...$] } : $,
  type,
});
/** @internal */
interface Typer<A, B, C> {
  (): { type: A };
  <const D extends B>($: D): { type: A; const: D };
  <const D extends readonly [B, ...B[]]>($: D): { type: A; enum: Writable<D> };
  <const D extends Only<C, D>>($: D): Writable<{ type: A } & D>;
}
/** Creates a boolean schema. */
export const bit: Typer<"boolean", boolean, never> = /* @__PURE__ */
  typer.bind(null, "boolean");
/** Creates an integer schema. */
export const int: Typer<"integer", number, Numeric> = /* @__PURE__ */
  typer.bind(null, "integer");
/** Creates a number schema. */
export const num: Typer<"number", number, Numeric> = /* @__PURE__ */
  typer.bind(null, "number");
/** Creates a string schema. */
export const str: Typer<"string", string, Stringy> = /* @__PURE__ */
  typer.bind(null, "string");
/** @internal */
type ArrMeta<A> = Omit<Extract<Arr, A>, "type" | "items" | "prefixItems">;
/** Creates an array schema. */
export const arr = (($: Schema | Schema[], meta?: {}) => ({
  ...isArray($)
    ? {
      minItems: $.length,
      ...meta,
      prefixItems: structuredClone($),
      items: false,
    }
    : { ...meta, items: structuredClone($) },
  type: "array",
})) as {
  <
    const A extends Schema,
    const B extends Only<ArrMeta<{ items: Schema }>, B> = {},
  >($: A, meta?: B): Writable<{ type: "array"; items: A } & B>;
  <
    const A extends readonly Schema[],
    const B extends Only<Partial<ArrMeta<{ items: false }>>, B> = {},
  >($: A, meta?: B): Writable<
    {
      type: "array";
      prefixItems: Writable<A>;
      items: false;
      minItems: B["minItems"] extends infer C extends number ? C : A["length"];
    } & Omit<B, "minItems">
  >;
};
/** @internal */
type ObjMeta<A> = Omit<
  Extract<Obj, A>,
  "type" | "properties" | "additionalProperties"
>;
/** @internal */
type Keys<A> = Tuple<`${Exclude<keyof A, symbol>}`>;
/** Creates an object schema. */
export const obj = (($: any, { required, ...meta }: any = {}) => ({
  ...typeof $ === "string"
    ? {
      required: [$],
      oneOf: Object.entries<Extract<Obj, { properties: {} }>>(meta).map((
        [key, { properties, required }],
      ) => obj({ ...properties, [$]: str(key) }, { required })),
    }
    : typeof $.type !== "string"
    ? {
      ...meta,
      required: required ? [...required] : Object.keys($),
      properties: structuredClone($),
      additionalProperties: false,
    }
    : { ...meta, additionalProperties: structuredClone($) },
  type: "object",
})) as {
  <
    const A extends Schema,
    const B extends Only<ObjMeta<{ additionalProperties: Schema }>, B> = {},
  >($: A, meta?: B): Writable<{ type: "object"; additionalProperties: A } & B>;
  <
    const A extends { [_: string]: Schema },
    const B extends Only<Partial<ObjMeta<{ properties: {} }>>, B> = {},
  >($: A, meta?: B): Writable<
    {
      type: "object";
      properties: Writable<A>;
      additionalProperties: false;
      required: B["required"] extends infer C extends readonly string[]
        ? Writable<C>
        : Keys<A>;
    } & Omit<B, "required">
  >;
  <
    const A extends string,
    const B extends { [_: string]: Extract<Obj, { properties: {} }> },
  >(key: A, mapping: keyof B extends never ? never : B): {
    type: "object";
    required: [A];
    oneOf: Keys<B> extends infer C extends (`${Exclude<keyof B, symbol>}`)[] ? {
        [D in keyof C]: Writable<
          Omit<B[C[D]], "properties"> & {
            properties: Writable<
              & {
                [_ in A]: { type: "string"; const: `${Exclude<C[D], symbol>}` };
              }
              & Omit<B[C[D]]["properties"], A>
            >;
          }
        >;
      }
      : never;
  };
};
