/** @module build */
import type { Arr, Bit, Int, Num, Obj, Schema, Str } from "@libn/json/schema";
import { isArray, type Only, type Tuple, type Writable } from "./lib.ts";

/** Creates a null schema. */
export const nil = (($?: Schema) => (
  $
    ? { type: ["null", $.type], oneOf: [{ type: "null" }, $] }
    : { type: "null" }
)) as {
  (): { type: "null" };
  <const A extends Schema>($: A): {
    type: ["null", A["type"]];
    oneOf: [{ type: "null" }, Writable<A>];
  };
};
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
  <const B extends Only<Omit<A, "type" | "const" | "enum">, B>>(
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
      ...meta,
      prefixItems: $,
      items: false,
    }
    : { ...meta, items: $ },
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
/** Creates an object schema. */
export const obj = (($: any, meta?: any) => ({
  ...typeof $ === "string"
    ? {
      required: [$],
      oneOf: Object.entries<Extract<Obj, { properties: {} }>>(meta).map((
        [key, { properties, required }],
      ) => obj({ ...properties, [$]: str(key) }, { required })),
    }
    : typeof $.type !== "string"
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
        : Tuple<`${Exclude<keyof A, symbol>}`>;
    } & Omit<B, "required">
  >;
  <
    const A extends string,
    const B extends { [_: string]: Extract<Obj, { properties: {} }> },
  >(key: A, mapping: keyof B extends never ? never : B): {
    type: "object";
    required: [A];
    oneOf: Tuple<keyof B> extends infer C extends (keyof B)[] ? {
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
