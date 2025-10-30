import { type Exact, isArray, type Tuple, type Writable } from "./lib.ts";
import type { Arr, Bit, Int, Nil, Num, Obj, Schema, Str } from "./schema.ts";

/** Creates a null schema. */
export const nil = (): Nil => ({ type: "null" });
const typer = (type: string, $?: any) => ($ === undefined ? { type } : {
  ...typeof $ !== "object" ? { const: $ } : isArray($) ? { enum: $ } : $,
  type,
});
/** @internal */
type Typer<A extends Bit | Int | Num | Str> = {
  (): { type: A["type"] };
  <const B extends Exclude<A["const"], undefined>>(
    $: B,
  ): { type: A["type"]; const: B };
  <const B extends Exclude<A["enum"], undefined>>(
    $: B,
  ): { type: A["type"]; enum: Writable<B> };
  <const B extends Exact<Omit<A, "type" | "const" | "enum">, B>>(
    $: B,
  ): Writable<{ type: A["type"] } & B>;
};
/** Creates a boolean schema. */
export const bit: Typer<Bit> = /* @__PURE__ */ typer.bind(null, "boolean");
/** Creates an integer schema. */
export const int: Typer<Int> = /* @__PURE__ */ typer.bind(null, "integer");
/** Creates a number schema. */
export const num: Typer<Num> = /* @__PURE__ */ typer.bind(null, "number");
/** Creates a string schema. */
export const str: Typer<Str> = /* @__PURE__ */ typer.bind(null, "string");
/** @internal */
type ArrMeta<A> = Omit<Extract<Arr, A>, "type" | "items" | "prefixItems">;
/** Creates an array schema. */
export const arr = (($: Schema | Schema[], meta?: {}) => ({
  ...isArray($)
    ? {
      minItems: $.length,
      maxItems: $.length,
      ...meta,
      prefixItems: $,
      items: false,
    }
    : { ...meta, items: $ },
  type: "array",
})) as {
  <
    const A extends Schema,
    const B extends Exact<ArrMeta<{ items: Schema }>, B> = {},
  >($: A, meta?: B): Writable<{ type: "array"; items: Writable<A> } & B>;
  <
    const A extends readonly Schema[],
    const B extends Exact<Partial<ArrMeta<{ items: false }>>, B> = {},
  >($: A, meta?: B): Writable<
    {
      type: "array";
      prefixItems: A;
      items: false;
      minItems: B["minItems"] extends infer C extends number ? C : A["length"];
      maxItems: B["maxItems"] extends infer C extends number ? C : A["length"];
    } & Omit<B, "minItems" | "maxItems">
  >;
};
/** @internal */
type ObjMeta<A> = Omit<
  Extract<Obj, A>,
  "type" | "properties" | "additionalProperties"
>;
/** Creates an object schema. */
export const obj = (($: Schema | { [_: string]: Schema }, meta?: {}) => ({
  ...typeof $.type !== "string"
    ? {
      required: Object.keys($),
      ...meta,
      properties: $,
      additionalProperties: false,
    }
    : { ...meta, additionalProperties: $ },
  type: "object",
})) as {
  <
    const A extends Schema,
    const B extends ObjMeta<{ additionalProperties: Schema }> = {},
  >($: A, meta?: B): Writable<{ type: "object"; additionalProperties: A } & B>;
  <
    const A extends { [_: string]: Schema },
    const B extends Partial<ObjMeta<{ properties: {} }>> = {},
  >($: A, meta?: B): Writable<
    {
      type: "object";
      properties: A;
      additionalProperties: false;
      required: B["required"] extends infer C extends readonly string[] ? C
        : Tuple<keyof A>;
    } & Omit<B, "required">
  >;
};
/** Creates a union schema. */
export const one = <
  const A extends string,
  const B extends { [_: string]: Extract<Obj, { properties: {} }> },
>(key: A, mapping: B): {
  type: "object";
  properties: { [_ in A]: { type: "string"; enum: Tuple<keyof B> } };
  required: [A];
  oneOf: Tuple<keyof B> extends infer C extends (keyof B)[] ? {
      [D in keyof C]: Writable<
        Omit<B[C[D]], "properties"> & {
          properties:
            & { [_ in A]: { type: "string"; const: C[D] } }
            & Omit<B[C[D]]["properties"], A>;
        }
      >;
    }
    : never;
} => ({
  type: "object",
  properties: { [key]: str<any>(Object.keys(mapping)) } as any,
  required: [key],
  oneOf: Object.entries(mapping).map(([$, source]) => {
    const target: Parameters<typeof obj>[1] = {};
    if (source.minProperties !== undefined) {
      target.minProperties = source.minProperties;
    }
    if (source.maxProperties !== undefined) {
      target.maxProperties = source.maxProperties;
    }
    if (source.required) target.required = source.required;
    return [obj({ ...source.properties, [key]: str($) }, target)];
  }) as any,
});
