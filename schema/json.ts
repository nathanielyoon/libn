/** Valid JSON, but with `undefined` instead of `null`. */
export type Json = undefined | boolean | number | string | Json[] | {
  [key: string]: Json;
};
/** Format patterns. */
export const FORMAT = {
  email: /^[\w'+-](?:\.?[\w'+-])*@(?:[\dA-Za-z][\dA-Za-z-]*\.)+[A-Za-z]{2,}$/,
  "date-time":
    /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])T(?:[01]\d|2[0-3]):[0-5]\d:[0-5]\d\.\d{3}Z$/,
  pkey: /^~[-\w]{43}$/,
  skey: /^\.[-\w]{43}$/,
};
type Numeric =
  | { const: number }
  | { enum: readonly [number, ...number[]] }
  | { minimum?: number; maximum?: number; multipleOf?: number };
type Meta = {
  boolean: { const: boolean } | { enum: readonly [boolean] } | {};
  integer: Numeric;
  number: Numeric;
  string: { const: string } | { enum: readonly [string, ...string[]] } | {
    minLength?: number;
    maxLength?: number;
    format?: keyof typeof FORMAT;
    pattern?: string;
  };
  array: {
    items:
      | Schema<"boolean" | "number">
      | Schema<"string"> & { format: keyof typeof FORMAT };
    minItems?: number;
    maxItems?: number;
    uniqueItems?: boolean;
  } | { items: Schema; minItems?: number; maxItems: number };
  object: {
    patternProperties: { [pattern: string]: Schema };
    additionalProperties: false;
    minProperties?: number;
    maxProperties: number;
  } | {
    properties: { [key: string]: Schema };
    additionalProperties: false;
    required?: readonly string[];
  };
};
/** JSON schema (restricted subset). */
export type Schema<A extends keyof Meta = keyof Meta> = A extends string
  ? { type: A } & Meta[A]
  : never;
/** Schema-defined data. */
export type Infer<A extends Schema> = Schema extends A ? Json
  : A extends { const: infer B } | { enum: readonly (infer B)[] } ? B
  : A["type"] extends "boolean" ? boolean
  : A["type"] extends "number" | "integer" ? number
  : A extends { format: infer B }
    ? B extends "email" ? `${string}@${string}.${string}`
    : A extends "date-time"
      ? `${number}-${number}-${number}T${number}:${number}:${number}.${number}Z`
    : B extends `${infer C}key` ? `${C extends "p" ? "~" : "."}${string}`
    : never
  : A["type"] extends "string" ? string
  : A extends { items: infer B extends Schema } ? readonly Infer<B>[]
  : A extends { patternProperties: { [pattern: string]: infer B } }
    ? B extends Schema ? { [key: string]: Infer<B> } : never
  : A extends { properties: infer B extends { [key: string]: Schema } }
    ? A extends { required: readonly (infer C extends string)[] } ? (
        & { [D in Extract<keyof B, C>]: Infer<B[D]> }
        & { [D in Exclude<keyof B, C>]?: Infer<B[D]> }
      ) extends infer E ? { [F in keyof E]: E[F] } : never
    : { [C in keyof B]?: Infer<B[C]> }
  : never;
type Esc<A extends PropertyKey, B extends number, C> = C extends
  `${infer D}${A & string}${infer F}` ? `${D}~${B}${Esc<A, B, F>}` : C & string;
/** Union of error indicators. */
export type Fail<A extends Schema, B extends string = ""> = {
  [C in keyof A]: A[C] extends infer D
    ? D extends Schema ? Fail<D, `${B}/${number}`>
    : D extends { [key: string]: Schema }
      ? { [E in keyof D]: Fail<D[E], `${B}/${E & string}`> }[keyof D]
    : {
      where: B;
      what: unknown;
      why: [
        C,
        C extends "required" ? D extends readonly any[] ? D[number] : never : D,
      ];
    }
    : never;
}[keyof A] extends infer C ? C extends {} ? C : never : never;
/** Utility type to convert a union to an intersection. */
export type Intersect<A> = (A extends never ? never : (_: A) => void) extends
  (_: infer B) => void ? B : never;
