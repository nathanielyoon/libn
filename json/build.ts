import type { Tuple, Writable } from "./lib.ts";
import type { Arr, Bit, Nil, Num, Obj, One, Schema, Str } from "./schema.ts";

/** Creates a null schema. */
export const nil = (): Nil => ({ type: "null" });
const typer = (type: string, $?: any) => ({
  type,
  ...typeof $ !== "object" ? { const: $ } : Array.isArray($) ? { enum: $ } : $,
});
/** @internal */
type Typer<A, B, C> = {
  (): { type: A };
  <const D extends B>($: D): { type: A; const: D };
  <const D extends readonly [B, ...B[]]>($: D): { type: A; enum: D };
  <const D extends Omit<C, "type">>($: D): Writable<{ type: A } & D>;
};
/** Creates a boolean schema. */
export const boolean: Typer<"boolean", boolean, Bit> = /* @__PURE__ */
  typer.bind(null, "boolean");
/** Creates an integer schema. */
export const integer: Typer<"integer", number, Num> = /* @__PURE__ */
  typer.bind(null, "integer");
/** Creates a number schema. */
export const number: Typer<"number", number, Num> = /* @__PURE__ */
  typer.bind(null, "number");
/** Creates a string schema. */
export const string: Typer<"string", string, Str> = /* @__PURE__ */
  typer.bind(null, "string");
/** Creates an array schema. */
export const array =
  ((items: Schema, $?: any) => ({ type: "array", items, ...$ })) as {
    <const A extends Schema>($: A): { type: "array"; items: Writable<A> };
    <const A extends Schema, const B extends Omit<Arr, "type" | "items">>(
      items: A,
      $: B,
    ): Writable<{ type: "array"; items: A } & B>;
  };
/** Creates an object schema. */
export const object = ((properties: {}, $?: any) => ({
  type: "object",
  properties,
  required: Object.keys(properties),
  additionalProperties: false,
  ...$,
})) as {
  <const A extends { [_: string]: Schema }>(properties: A): {
    type: "object";
    properties: Writable<A>;
    required: Tuple<keyof A>;
    additionalProperties: false;
  };
  <
    const A extends { [_: string]: Schema },
    const B extends Omit<Obj, "type" | "properties" | "additionalProperties">,
  >(properties: A, $: B): Writable<
    { type: "object"; properties: A; additionalProperties: false } & B
  >;
  <
    const A extends { [_: string]: Schema },
    const B extends Omit<Obj, "type" | "properties" | "additionalProperties">,
  >(properties: A, $: B): Writable<
    {
      type: "object";
      properties: A;
      required: Tuple<keyof A>;
      additionalProperties: false;
    } & B
  >;
};
/** Creates a union schema. */
export const union = <const A extends One["oneOf"]>(...$: A): { oneOf: A } => ({
  oneOf: $,
});
