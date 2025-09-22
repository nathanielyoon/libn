/** @internal */
import type { Json } from "@libn/lib";

/** Content encoding types. */
export type Base = `base${"16" | "32" | "32hex" | "64" | "64url"}`;
/** String formats (asserted). */
export type Formats = {
  date: `${number}-${number}-${number}`;
  time: `${number}:${number}:${number}.${number}Z`;
  "date-time": `${Formats["date"]}T${Formats["time"]}`;
  email: `${string}@${string}.${string}`;
  uri: `${string}:${string}`;
  uuid: `${string}-${string}-${string}-${string}-${string}`;
};
/** String format types. */
export type Format = keyof Formats;
/** @internal */
type Types = {
  boolean: { enum?: readonly [boolean] };
  number: {
    enum?: readonly [number, ...number[]];
    minimum?: number;
    maximum?: number;
    exclusiveMinimum?: number;
    exclusiveMaximum?: number;
    multipleOf?: number;
  };
  string: {
    enum?: readonly [string, ...string[]];
    minLength?: number;
    maxLength?: number;
    contentEncoding?: Base;
    format?: Format;
    pattern?: string;
  };
  array: {
    items?: Type;
    minItems?: number;
    maxItems?: number;
    uniqueItems?: boolean;
  };
  object: {
    properties?: { [key: string]: Type };
    required?: readonly string[];
    additionalProperties?: boolean;
    minProperties?: number;
    maxProperties?: number;
  };
};
/** JSON schema subset. */
export type Type<A extends keyof Types = keyof Types> = A extends string
  ? { type: A; title?: string; description?: string } & Types[A]
  : never;
/** Schema-defined data. */
export type Data<A extends Type> = A extends { enum: readonly (infer B)[] } ? B
  : A["type"] extends "boolean" ? boolean
  : A["type"] extends "number" ? number
  : A extends { format: infer B extends Format } ? Formats[B]
  : A["type"] extends "string" ? string
  : A extends { items: infer B extends Type } ? readonly Data<B>[]
  : A["type"] extends "array" ? readonly Json[]
  : A extends { properties: infer B extends { [key: string]: Type } } ?
      & (A extends { required: readonly (infer C extends string)[] } ? (
          & { [D in Extract<keyof B, C>]: Data<B[D]> }
          & { [D in Exclude<keyof B, C>]?: Data<B[D]> }
        ) extends infer E ? { [F in keyof E]: E[F] } : never
        : { [C in keyof B]?: Data<B[C]> })
      & (A extends { additionalProperties: false } ? {} : { [_: string]: Json })
  : A["type"] extends "object" ? { [_: string]: Json }
  : never;
/** Error indicators. */
export type Fail = {
  path: string;
  raw: unknown;
  error: readonly [string, Json];
}[];
