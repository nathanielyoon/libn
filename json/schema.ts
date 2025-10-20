import type { Join, Json, Kind, Meta, Tuple, Type, Xor } from "./lib.ts";
import { ENCODING, type Encoding, FORMAT, type Format } from "./regex.ts";

declare const TYPE: unique symbol;
/** JSON schema subset. */
export type Schema =
  & { [TYPE]: Json }
  & (
    | { type: "boolean" }
      & Xor<[{ enum: readonly [boolean, ...boolean[]] }, {}]>
    | { type: ["boolean", "null"] }
      & Xor<[{ enum: readonly [boolean, ...boolean[], null] }, {}]>
    | { type: "integer" }
      & Xor<[{ enum: readonly [number, ...number[]] }, Meta["number"]]>
    | { type: ["integer", "null"] }
      & Xor<[{ enum: readonly [number, ...number[], null] }, Meta["number"]]>
    | { type: "number" }
      & Xor<[{ enum: readonly [number, ...number[]] }, Meta["number"]]>
    | { type: ["number", "null"] }
      & Xor<[{ enum: readonly [number, ...number[], null] }, Meta["number"]]>
    | { type: "string" }
      & Xor<[
        { enum: readonly [string, ...string[]] },
        & Meta["string"]
        & Xor<
          [{ format: keyof Format }, { contentEncoding: keyof Encoding }, {}]
        >,
      ]>
    | { type: ["string", "null"] }
      & Xor<[
        { enum: readonly [string, ...string[], null] },
        & Meta["string"]
        & Xor<
          [{ format: keyof Format }, { contentEncoding: keyof Encoding }, {}]
        >,
      ]>
    | { type: "array" | ["array", "null"] }
      & Meta["array"]
      & Xor<[{ items: Schema }, { prefixItems: readonly Schema[] }]>
    | { type: "object" | ["object", "null"] }
      & Meta["object"]
      & Xor<[
        { patternProperties: { [_: string]: Schema } },
        { properties: { [_: string]: Schema }; required: readonly string[] },
      ]>
  );
/** Inferred value type. */
export type Instance<A> = A extends { [TYPE]: infer B extends Json } ? B : Json;
const schema = (
  type: Kind,
  form1: ($: any[], options?: any) => any,
  form2: ($?: any, options?: any) => any,
  $?: any,
  options?: any,
) => ({ type, ...Array.isArray($) ? form1($, options) : form2($, options) });
type Typey<A extends keyof Meta, B = A> = Meta[A] & { type?: B | [B, "null"] };
type Typed<A extends Kind, B, C = Type[A]> = B extends
  { type: [infer D extends Kind, "null"] }
  ? { type: [D, "null"]; [TYPE]: C | null }
  : B extends { type: infer D extends Kind } ? { type: D; [TYPE]: C }
  : { type: A; [TYPE]: C };
type Primitive<A extends keyof Meta, B extends Kind = A> = {
  <
    const C extends
      | readonly [Type[B], ...Type[B][]]
      | readonly [Type[B], ...Type[B][], null],
  >(enums: C): {
    type: C extends readonly [...any[], null] ? [A, "null"] : A;
    enum: C;
    [TYPE]: C[number];
  };
  <const C extends Typey<A, B> = {}>(meta?: C): Join<C & Typed<A, C>>;
};
const enumer = <A extends keyof Meta>(type: A) => ($: (Type[A] | null)[]) => (
  { type: $[$.length - 1] === null ? [type, "null"] : type, enum: $ }
);
/** Creates a boolean schema. */
export const boolean: Primitive<"boolean"> = /* @__PURE__ */
  schema.bind(null, "boolean", enumer("boolean"), ($) => $);
/** Creates a number schema. */
export const number: Primitive<"number", "integer" | "number"> = /* @__PURE__ */
  schema.bind(null, "number", enumer("number"), ($) => $);
/** Creates a string schema. */
export const string: Primitive<"string"> & {
  <const A extends keyof Format, const B extends Typey<"string"> = {}>(
    format: A,
    meta?: B,
  ): Join<B & { format: A } & Typed<"string", B, Format[A]>>;
  <const A extends keyof Encoding, const B extends Typey<"string"> = {}>(
    encoding: A,
    meta?: B,
  ): Join<B & { contentEncoding: A } & Typed<"string", B, Encoding[A]>>;
} = /* @__PURE__ */ schema.bind(null, "string", enumer("string"), ($, meta) => {
  if (typeof $ !== "string") return $;
  if (Object.hasOwn(FORMAT, $)) return { ...meta, format: $ };
  if (Object.hasOwn(ENCODING, $)) return { ...meta, contentEncoding: $ };
  return meta;
});
/** Creates an array schema. */
export const array: {
  <A extends Schema, const B extends Typey<"array"> = {}>(
    items: A,
    meta?: B,
  ): Join<B & { items: A } & Typed<"array", B, readonly A[typeof TYPE][]>>;
  <const A extends readonly Schema[], const B extends Typey<"array"> = {}>(
    prefixItems: A,
    meta?: B,
  ): Join<
    & B
    & { prefixItems: A; minItems: A["length"]; maxItems: A["length"] }
    & Typed<"array", B, { -readonly [C in keyof A]: A[C][typeof TYPE] }>
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
    const C extends Typey<"object"> = {},
  >([pattern, property]: [A, B], meta?: C): Join<
    & C
    & { patternProperties: { [_ in A]: B }; additionalProperties: false }
    & Typed<"object", C, { [_: string]: B[typeof TYPE] }>
  >;
  <
    const A extends { [_: string]: Schema },
    const B extends Typey<"object"> = {},
  >(properties: A, meta?: B): Join<
    B & {
      properties: A;
      additionalProperties: false;
      required: string extends keyof A ? string[] : Tuple<keyof A>;
    } & Typed<"object", B, { -readonly [C in keyof A]: A[C][typeof TYPE] }>
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
