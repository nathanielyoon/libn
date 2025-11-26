/** @internal */
import type { Json, Merge, Tuple } from "@libn/types";

/** @internal */
interface Nil {
  oneOf: readonly [{ type: "null" }, Exclude<Schema, Nil>];
}
/** @internal */
interface Opt {
  enum: readonly [boolean | number | string, ...(boolean | number | string)[]];
}
/** @internal */
interface Bit {
  type: "boolean";
}
/** @internal */
interface Num {
  type: "number";
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
}
/** @internal */
interface Str {
  type: "string";
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  format?: "date" | "time" | "date-time" | "email" | "uri" | "uuid";
  contentEncoding?: `base${"16" | "32" | "32hex" | "64" | "64url"}`;
}
/** @internal */
interface Arr {
  type: "array";
  items: Schema;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
}
/** @internal */
interface Obj {
  type: "object";
  properties: { [_: string]: Schema };
  additionalProperties: false;
  required: readonly string[];
  minProperties?: number;
  maxProperties?: number;
}
/** JSON schema. */
export type Schema = Nil | Opt | Bit | Num | Str | Arr | Obj;
/** JSON instance. */
export type Instance<A extends Schema> = Schema extends A ? Json
  : A extends { enum: readonly (infer B)[] } ? B
  : A extends { type: "boolean" } ? boolean
  : A extends { type: "number" } ? number
  : A extends { type: "string" } ? string
  : A extends { items: infer B extends Schema } ? readonly Instance<B>[]
  : A extends {
    properties: infer B extends { [_: string]: Schema };
    required: readonly (infer C extends string)[];
  } ? Merge<
      & { [D in Extract<`${Exclude<keyof B, symbol>}`, C>]: Instance<B[D]> }
      & { [D in Exclude<`${Exclude<keyof B, symbol>}`, C>]?: Instance<B[D]> }
    >
  : A extends { oneOf: readonly [{ type: "null" }, infer B extends Schema] }
    ? null | Instance<B>
  : never;
type Writable<A> = A extends A ? { -readonly [B in keyof A]: A[B] } : never;
type Readable<A> = A extends A ? { readonly [B in keyof A]: A[B] } : never;
type Assign<A, B> = Writable<B & Omit<A, keyof B>>;
/** @internal */
type Meta<A, B extends string> =
  & Omit<Extract<Schema, { type: A }>, "type" | B>
  & { [_: string]: Json };
/** Creates a nullable schema. */
export const nil = ((schema: {}, $?: {}) => ({
  ...$,
  oneOf: [{ type: "null" }, structuredClone(schema)],
})) as {
  <const A extends Exclude<Schema, { oneOf: {} }>>(
    schema: A,
  ): { oneOf: [{ type: "null" }, Writable<A>] };
  <
    const A extends Exclude<Schema, { oneOf: {} }>,
    const B extends { [_: string]: Json },
  >(schema: A, $: B): Assign<B, { oneOf: [{ type: "null" }, Writable<A>] }>;
};
/** Creates an enum schema. */
export const opt = ((options: Json[], $?: {}) => ({ ...$, enum: options })) as {
  <const A extends Opt["enum"]>(options: A): { enum: Readable<A> };
  <
    const A extends Opt["enum"],
    const B extends { [_: string]: Json },
  >(options: A, $: B): Assign<B, { enum: Readable<A> }>;
};
/** Creates a boolean schema. */
export const bit = (($?: {}) => ({ ...$, type: "boolean" })) as {
  (): { type: "boolean" };
  <const A extends { [_: string]: Json }>($: A): Assign<A, { type: "boolean" }>;
};
/** Creates a number schema. */
export const num = (($?: any) => ({ ...$, type: "number" })) as {
  (): { type: "number" };
  <const A extends Meta<"number", never>>($: A): Assign<A, { type: "number" }>;
};
/** Creates a string schema. */
export const str = (($?: any) => ({ ...$, type: "string" })) as {
  (): { type: "string" };
  <const A extends Meta<"string", never>>($: A): Assign<A, { type: "string" }>;
};
/** Creates an array schema. */
export const arr = ((items: Schema, $?: any) => (
  { ...$, type: "array", items: structuredClone(items) }
)) as {
  <const A extends Schema>(items: A): { type: "array"; items: Writable<A> };
  <const A extends Schema, const B extends Meta<"array", "items">>(
    items: A,
    $: B,
  ): Assign<B, { type: "array"; items: Writable<A> }>;
};
/** Creates an object schema. */
export const obj = ((properties: {}, { required, ...$ }: any = {}) => ({
  ...$,
  type: "object",
  properties: structuredClone(properties),
  additionalProperties: false,
  required: required ? [...required] : Object.keys(properties),
})) as {
  <const A extends { [_: string]: Schema }>(properties: A): {
    type: "object";
    properties: Writable<A>;
    additionalProperties: false;
    required: readonly Tuple<`${Exclude<keyof A, symbol>}`>[number][];
  };
  <
    const A extends { [_: string]: Schema },
    const B extends Meta<
      "object",
      "properties" | "additionalProperties" | "required"
    >,
    const C extends readonly (keyof A & string)[],
  >(properties: A, $: B & { required: C }): Assign<B, {
    type: "object";
    properties: Writable<A>;
    additionalProperties: false;
    required: Readable<C>;
  }>;
  <
    const A extends { [_: string]: Schema },
    const B extends Meta<
      "object",
      "properties" | "additionalProperties" | "required"
    >,
  >(properties: A, $: "required" extends keyof B ? never : B): Assign<B, {
    type: "object";
    properties: Writable<A>;
    additionalProperties: false;
    required: readonly Tuple<`${Exclude<keyof A, symbol>}`>[number][];
  }>;
};
