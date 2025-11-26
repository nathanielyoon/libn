/** @internal */
import type { Tuple } from "@libn/types";
import type { Schema } from "./schema.ts";

type Writable<A> = A extends A ? { -readonly [B in keyof A]: A[B] } : never;
type Readable<A> = A extends A ? { readonly [B in keyof A]: A[B] } : never;
type Overwrite<A, B> = Writable<Omit<A, keyof B> & B>;
/** @internal */
type As<A, B extends string> = Omit<Extract<Schema, { type: A }>, "type" | B>;
/** Creates a nullable schema. */
export const nil = <const A extends Exclude<Schema, { oneOf: {} }>>($: A): {
  oneOf: [{ type: "null" }, Writable<A>];
} => ({
  oneOf: [{ type: "null" }, structuredClone($ as Writable<A>)],
} satisfies Extract<Schema, { oneOf: {} }>);
/** Creates an enum schema. */
export const opt = <
  const A extends [boolean | number | string, ...(boolean | number | string)[]],
>($: A): { enum: Readable<A> } => ({ enum: [...$ as Readable<A>] });
/** Creates a boolean schema. */
export const bit = (): { type: "boolean" } => ({ type: "boolean" });
/** Creates a number schema. */
export const num = (($?: any) => ({ ...$, type: "number" })) as {
  (): { type: "number" };
  <const A extends As<"number", never>>($: A): Overwrite<A, { type: "number" }>;
};
/** Creates a string schema. */
export const str = (($?: any) => ({ ...$, type: "string" })) as {
  (): { type: "string" };
  <const A extends As<"string", never>>($: A): Overwrite<A, { type: "string" }>;
};
/** Creates an array schema. */
export const arr = ((items: Schema, $?: any) => (
  { ...$, type: "array", items: structuredClone(items) }
)) as {
  <const A extends Schema>(items: A): { type: "array"; items: Writable<A> };
  <const A extends Schema, const B extends As<"array", "items">>(
    items: A,
    $: B,
  ): Overwrite<B, { type: "array"; items: Writable<A> }>;
};
/** Creates an object schema. */
export const obj = ((properties: { [_: string]: Schema }, $?: string[]) => ({
  type: "object",
  properties: structuredClone(properties),
  additionalProperties: false,
  required: $ ? [...$] : Object.keys(properties),
})) as {
  <const A extends { [_: string]: Schema }>(properties: A): {
    type: "object";
    properties: Writable<A>;
    additionalProperties: false;
    required: Tuple<`${Exclude<keyof A, symbol>}`>[number][];
  };
  <
    const A extends { [_: string]: Schema },
    const B extends readonly (string & keyof A)[],
  >(properties: A, required: B): {
    type: "object";
    properties: Writable<A>;
    additionalProperties: false;
    required: Readable<B>;
  };
};
