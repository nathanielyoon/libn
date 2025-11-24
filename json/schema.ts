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
    { items: Type; minItems?: number; maxItems?: number },
    { prefixItems: readonly Type[]; items: false; minItems: number },
  ]>;
/** @internal */
type Properties = Extract<Obj, { properties: {} }>;
/** Object schema. */
export type Obj =
  & { type: "object" }
  & Xor<[{
    additionalProperties: Type;
    propertyNames?: Str;
    minProperties?: number;
    maxProperties?: number;
  }, {
    properties: { [_: string]: Type };
    additionalProperties: false;
    required: readonly string[];
  }, {
    required: readonly [string];
    oneOf: readonly [Properties, ...Properties[]];
  }]>;
/** JSON schema subset. */
export type Type = Nil | Bit | Int | Num | Str | Arr | Obj;
/** @internal */
type Prefix<
  A extends readonly Type[],
  B extends number,
  D extends unknown[] = [],
> = A extends readonly [infer E extends Type, ...infer F extends Type[]]
  ? Prefix<
    F,
    B,
    B extends D["length"] ? [...D, Data<E>?] : [...D, Data<E>]
  >
  : D;
/** @internal */
type Natural<A extends number> = `${A}` extends `-${string}` ? 0 : A;
/** Typed JSON value. */
export type Data<A extends Type> = Type extends A ? Json
  : A extends { const: infer B } ? B
  : A extends { enum: readonly (infer B)[] } ? B
  : A extends { oneOf: [Nil, infer B extends Type] } ? null | Data<B>
  : A["type"] extends "null" ? null
  : A["type"] extends "boolean" ? boolean
  : A["type"] extends "integer" | "number" ? number
  : A["type"] extends "string" ? string
  : A["type"] extends "array"
    ? A extends { items: infer B extends Type } ? readonly Data<B>[]
    : A extends {
      prefixItems: infer B extends readonly Type[];
      minItems: infer C extends number;
    } ? Prefix<B, Natural<C>>
    : never
  : A extends { additionalProperties: infer B extends Type }
    ? { [_: string]: Data<B> }
  : A extends {
    properties: infer B extends { [_: string]: Type };
    required: readonly (infer C extends string)[];
  } ? Writable<
      & { [D in Extract<`${Exclude<keyof B, symbol>}`, C>]: Data<B[D]> }
      & { [D in Exclude<`${Exclude<keyof B, symbol>}`, C>]?: Data<B[D]> }
    >
  : A extends
    { required: readonly [infer B extends string]; oneOf: readonly (infer C)[] }
    ? C extends Type
      ? Data<C> extends infer D extends { [_ in B]?: Json }
        ? Merge<Omit<D, B> & { [E in B]: Exclude<D[E], undefined> }>
      : never
    : never
  : never;
/** Creates a null schema. */
export const nil = (($?: Type) => (
  $ ? { type: ["null", $.type], oneOf: [nil(), $] } : { type: "null" }
)) as {
  (): { type: "null" };
  <const A extends Type>(
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
export const arr = (($: Type | Type[], meta?: {}) => ({
  ...isArray($)
    ? { minItems: $.length, ...meta, prefixItems: $, items: false }
    : { ...meta, items: $ },
  type: "array",
})) as {
  <
    const A extends Type,
    const B extends Only<ArrMeta<{ items: Type }>, B> = {},
  >($: A, meta?: B): Writable<{ type: "array"; items: A } & B>;
  <
    const A extends readonly Type[],
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
type One<A extends string, B extends Properties, C> = Writable<
  Omit<B, "properties"> & {
    properties: Writable<{ [_ in A]: C } & Omit<B["properties"], A>>;
  }
>;
/** @internal */
type Keys<A> = Tuple<`${Exclude<keyof A, symbol>}`>;
/** Creates an object schema. */
export const obj = (($: any, meta?: any) => ({
  ...typeof $ === "string"
    ? {
      required: [$],
      oneOf: isArray(meta)
        ? [
          obj({ ...meta[0].properties, [$]: bit(false) }, {
            required: meta[0].required,
          }),
          obj({ ...meta[1].properties, [$]: bit(true) }, {
            required: meta[1].required,
          }),
        ]
        : Object.entries<any>(meta).map(([key, value]) =>
          obj({ ...value.properties, [$]: str(key) }, {
            required: value.required,
          })
        ),
    }
    : typeof $.type !== "string"
    ? {
      ...meta,
      required: meta?.required ? [...meta.required] : Object.keys($),
      properties: $,
      additionalProperties: false,
    }
    : { ...meta, additionalProperties: $ },
  type: "object",
})) as {
  <
    const A extends Type,
    const B extends Only<ObjMeta<{ additionalProperties: Type }>, B> = {},
  >($: A, meta?: B): Writable<{ type: "object"; additionalProperties: A } & B>;
  <
    const A extends { [_: string]: Type },
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
    const B extends [Properties, Properties],
  >(key: A, mapping: B): {
    type: "object";
    required: [A];
    oneOf: [
      One<A, B[0], { type: "boolean"; const: false }>,
      One<A, B[1], { type: "boolean"; const: true }>,
    ];
  };
  <
    const A extends string,
    const B extends { [_: string]: Properties },
  >(key: A, mapping: keyof B extends never ? never : B): {
    type: "object";
    required: [A];
    oneOf: Keys<B> extends infer C extends (`${Exclude<keyof B, symbol>}`)[] ? {
        [D in keyof C]: One<
          A,
          B[C[D]],
          { type: "string"; const: `${Exclude<C[D], symbol>}` }
        >;
      }
      : never;
  };
};
