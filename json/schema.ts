import type { Join, Json, Meta, Tuple, Type, Xor } from "./lib.ts";
import { ENCODING, type Encoding, FORMAT, type Format } from "./regex.ts";

/** Inferred value property, doesn't exist at runtime. */
export const TYPE = /* @__PURE__ */ Symbol("TYPE");
type Enums<A> = readonly [A, ...A[]] | readonly [A, ...A[], null];
/** JSON schema subset. */
export type Schema =
  | { type: "boolean" | readonly ["boolean", "null"]; [TYPE]: boolean | null }
    & Xor<[{ enum: Enums<boolean> }, {}]>
  | { type: "integer" | readonly ["integer", "null"]; [TYPE]: number | null }
    & Xor<[{ enum: Enums<number> }, Meta["number"]]>
  | { type: "number" | readonly ["number", "null"]; [TYPE]: number | null }
    & Xor<[{ enum: Enums<number> }, Meta["number"]]>
  | { type: "string" | readonly ["string", "null"]; [TYPE]: string | null }
    & Xor<[
      { enum: Enums<string> },
      & Meta["string"]
      & Xor<
        [{ format: keyof Format }, { contentEncoding: keyof Encoding }, {}]
      >,
    ]>
  | {
    type: "array" | readonly ["array", "null"];
    [TYPE]: readonly Json[] | null;
  }
    & Meta["array"]
    & Xor<[{ items: Schema }, { prefixItems: readonly Schema[] }]>
  | {
    type: "object" | readonly ["object", "null"];
    [TYPE]: { [_: string]: Json } | null;
    additionalProperties: false;
  }
    & Meta["object"]
    & Xor<[
      { patternProperties: { [_: string]: Schema } },
      { properties: { [_: string]: Schema }; required: readonly string[] },
    ]>;
/** Inferred value type. */
export type Instance<A> = A extends { [TYPE]: infer B extends Json } ? B : Json;
const schema = (
  type: keyof Type,
  form1: ($: any[], options?: any) => any,
  form2: ($?: any, options?: any) => any,
  $?: any,
  options?: any,
) => ({ type, ...Array.isArray($) ? form1($, options) : form2($, options) });
type Typer<A extends keyof Meta, B = A> = Meta[A] & {
  type?: B | readonly [B, "null"];
};
type Typed<A extends keyof Meta, B, C extends Type[A]> = Join<
  & (B extends { type: readonly [infer D extends keyof Type, "null"] }
    ? { type: readonly [D, "null"]; [TYPE]: C | null }
    : B extends { type: infer D extends keyof Type } ? { type: D; [TYPE]: C }
    : { type: A; [TYPE]: C })
  & { -readonly [D in keyof B]: B[D] }
>;
type Primitive<A extends keyof Meta, B extends keyof Type = A> = {
  <const C extends Enums<Type[B]>>(enums: C): {
    type: C extends readonly [...any[], null] ? readonly [A, "null"] : A;
    enum: C;
    [TYPE]: C[number];
  };
  <const C extends Typer<A, B> = {}>(meta?: C): Typed<A, C, Type[A]>;
};
const enumer = <A extends keyof Meta>(type: A) => ($: (Type[A] | null)[]) => (
  { type: $[$.length - 1] === null ? [type, "null"] : type, enum: $ }
);
/** Creates a boolean schema. */
export const boolean: Primitive<"boolean"> = /* @__PURE__ */
  schema.bind(null, "boolean", /* @__PURE__ */ enumer("boolean"), ($) => $);
/** Creates a number schema. */
export const number: Primitive<"number", "integer" | "number"> = /* @__PURE__ */
  schema.bind(null, "number", /* @__PURE__ */ enumer("number"), ($) => $);
/** Creates a string schema. */
export const string: Primitive<"string"> & {
  <const A extends keyof Format, const B extends Typer<"string"> = {}>(
    format: A,
    meta?: B,
  ): Typed<"string", B & { format: A }, Format[A]>;
  <const A extends keyof Encoding, const B extends Typer<"string"> = {}>(
    encoding: A,
    meta?: B,
  ): Typed<"string", B & { contentEncoding: A }, Encoding[A]>;
} = /* @__PURE__ */ schema.bind(
  null,
  "string",
  /* @__PURE__ */ enumer("string"),
  ($, meta) => {
    if (typeof $ !== "string") return $;
    if (Object.hasOwn(FORMAT, $)) return { ...meta, format: $ };
    if (Object.hasOwn(ENCODING, $)) return { ...meta, contentEncoding: $ };
    return meta;
  },
);
/** Creates an array schema. */
export const array: {
  <A extends Schema, const B extends Typer<"array"> = {}>(
    items: A,
    meta?: B,
  ): Typed<"array", B & { items: A }, readonly A[typeof TYPE][]>;
  <const A extends readonly Schema[], const B extends Typer<"array"> = {}>(
    prefixItems: A,
    meta?: B,
  ): Typed<
    "array",
    B & { prefixItems: A; minItems: A["length"]; maxItems: A["length"] },
    { readonly [C in keyof A]: A[C][typeof TYPE] }
  >;
} = /* @__PURE__ */ schema.bind(null, "array", (prefixItems, meta) => ({
  ...meta,
  prefixItems,
  minLength: prefixItems.length,
  maxLength: prefixItems.length,
}), (items, meta) => ({ ...meta, items }));
/** Creates an object schema. */
export const object: {
  <
    const A extends string,
    const B extends Schema,
    const C extends Typer<"object"> = {},
  >([pattern, property]: [A, B], meta?: C): Typed<
    "object",
    C & { patternProperties: { [_ in A]: B }; additionalProperties: false },
    { [_: string]: B[typeof TYPE] }
  >;
  <
    const A extends { [_: string]: Schema },
    const B extends Typer<"object"> = {},
  >(properties: A, meta?: B): Typed<
    "object",
    B & {
      properties: { -readonly [C in keyof A]: A[C] };
      additionalProperties: false;
      required: string extends keyof A ? string[] : Tuple<keyof A>;
    },
    { -readonly [C in keyof A]: A[C][typeof TYPE] }
  >;
} = /* @__PURE__ */ schema.bind(
  null,
  "object",
  ([pattern, property], meta) => ({
    ...meta,
    patternProperties: { [pattern]: property },
    additionalProperties: false,
  }),
  (properties, meta) => ({
    ...meta,
    properties,
    required: Object.keys(properties),
    additionalProperties: false,
  }),
);
