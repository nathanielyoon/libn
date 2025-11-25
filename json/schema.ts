/** @internal */
import type { Json, Merge } from "@libn/types";

/** @internal */
interface Nil {
  oneOf: [{ type: "null" }, Exclude<Schema, Nil>];
}
/** @internal */
interface Opt {
  enum: [boolean | number | string, ...(boolean | number | string)[]];
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
  required?: readonly string[];
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
  : A extends { properties: infer B extends { [_: string]: Schema } }
    ? A extends { required: readonly (infer C extends string)[] } ? Merge<
        & { [D in Extract<`${Exclude<keyof B, symbol>}`, C>]: Instance<B[D]> }
        & { [D in Exclude<`${Exclude<keyof B, symbol>}`, C>]?: Instance<B[D]> }
      >
    : { [C in `${Exclude<keyof B, symbol>}`]?: Instance<B[C]> }
  : A extends { oneOf: [{ type: "null" }, infer B extends Schema] }
    ? null | Instance<B>
  : never;
