/** Intersection from union. */
export type Join<A> = (A extends never ? never : (_: A) => void) extends
  (_: infer B) => void ? B : never;
/** Tuple from union. */
export type Tuple<A> = Join<A extends never ? never : (_: A) => A> extends
  ((_: never) => infer B extends A) ? [...Tuple<Exclude<A, B>>, B] : [];
/** Non-empty array. */
export type Some<A> = readonly [A, ...A[]];
/** String formats. */
export type Formats = {
  date: `${number}-${number}-${number}`;
  time: `${number}:${number}:${number}.${number}Z`;
  "date-time": `${Formats["date"]}T${Formats["time"]}`;
  duration: `P${string}`;
  email: `${string}@${string}.${string}`;
  uri: `${string}:${string}`;
  uuid: `${string}-${string}-${string}-${string}-${string}`;
};
type Numeric = {
  enum?: Some<number>;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
};
type Stringy = { minLength?: number; maxLength?: number; pattern?: string };
/** Binary-to-text encodings. */
export type Base = `base${16 | 32 | "32hex" | 64 | "64url"}`;
/** IANA Media types. */
export type Media = `${
  | "text"
  | "image"
  | "audio"
  | "video"
  | "application"
  | "multipart"
  | "message"}/${string}`;
type Types = {
  boolean: { bit: { enum?: readonly [boolean] } };
  integer: { int: Numeric };
  number: { num: Numeric };
  string: {
    fmt: { format: keyof Formats } & Stringy;
    bin: { contentEncoding: Base; contentMediaType: Media } & Stringy;
    str: { enum?: Some<string> } & Stringy;
  };
  array: {
    ord: {
      prefixItems: readonly [Type, ...Type[]];
      minItems: number;
      maxItems: number;
    };
    vec: {
      items: Type<"bit" | "int" | "num" | "fmt" | "bin">;
      minItems?: number;
      maxItems?: number;
      uniqueItems?: boolean;
    };
    arr: { items: Type; minItems?: number; maxItems: number };
  };
  object: {
    map: {
      patternProperties: { [pattern: string]: Type };
      minProperties?: number;
      maxProperties: number;
      additionalProperties: false;
    };
    obj: {
      properties: { [key: string]: Type };
      required: readonly [string, ...string[]];
      additionalProperties?: boolean;
    };
  };
};
/** Types of JSON subtypes. */
export const KINDS = {
  bit: "boolean",
  int: "integer",
  num: "number",
  fmt: "string",
  bin: "string",
  str: "string",
  ord: "array",
  vec: "array",
  arr: "array",
  map: "object",
  obj: "object",
} as const satisfies Join<
  keyof Types extends infer A
    ? A extends keyof Types ? { [B in keyof Types[A]]: A } : never
    : never
>;
/** Schema metadata, including custom subtype (a non-standard extension). */
export type Meta<A extends keyof typeof KINDS = keyof typeof KINDS> = {
  kind: A;
  title?: string;
  description?: string;
};
/** JSON schema subset. */
export type Type<A extends keyof typeof KINDS = keyof typeof KINDS> =
  keyof Types extends infer B
    ? B extends keyof Types
      ? Types[B] extends infer C
        ? C extends {}
          ? Extract<keyof C, A> extends infer D extends keyof typeof KINDS
            ? D extends keyof C ? { type: B } & Meta<D> & C[D]
            : never
          : never
        : never
      : never
    : never
    : never;
/** Schema-defined data. */
export type Data<A extends Type> = A extends { enum: readonly (infer B)[] } ? B
  : A["type"] extends "boolean" ? boolean
  : A["type"] extends "integer" | "number" ? number
  : A extends { format: infer B extends keyof Formats } ? Formats[B]
  : A["type"] extends "string" ? string
  : A extends { prefixItems: infer B extends readonly Type[] }
    ? { [C in keyof B]: B[C] extends Type ? Data<B[C]> : never }
  : A extends { items: infer B extends Type } ? readonly Data<B>[]
  : A extends { patternProperties: { [pattern: string]: infer B } }
    ? B extends Type ? { [key: string]: Data<B> } : never
  : A extends {
    properties: infer B extends { [key: string]: Type };
    required: readonly (infer C extends string)[];
  } ? (
      & { [D in Extract<keyof B, C>]: Data<B[D]> }
      & { [D in Exclude<keyof B, C>]?: Data<B[D]> }
    ) extends infer E ? { [F in keyof E]: E[F] } : never
  : never;
type Esc<A extends PropertyKey, B extends number, C> = C extends
  `${infer D}${A & string}${infer F}` ? `${D}~${B}${Esc<A, B, F>}` : C & string;
/** Union of error indicators. */
export type Fail<A extends Type, B extends string = ""> =
  | {
    path: B;
    value: unknown;
    errors: {
      [
        C in Exclude<
          keyof A,
          keyof Meta | `${"prefixI" | "i"}tems` | `${"patternP" | "p"}roperties`
        >
      ]?: [C, A[C]] extends ["required", readonly (infer D)[]] ? D : A[C];
    };
  }
  | (A extends { prefixItems: infer C extends readonly Type[] }
    ? Extract<keyof C, string> extends infer D
      ? D extends keyof C & string
        ? C[D] extends Type ? Fail<C[D], `${B}/${D}`> : never
      : never
    : never
    : A extends { items: infer C extends Type } ? Fail<C, `${B}/${number}`>
    : A extends { patternProperties: { [key: string]: infer C } }
      ? C extends Type ? Fail<C, `${B}/${string}`> : never
    : A extends { properties: infer C extends { [key: string]: Type } }
      ? keyof C extends infer D
        ? D extends keyof C ? Fail<C[D], `${B}/${Esc<"/", 1, Esc<"~", 0, D>>}`>
        : never
      : never
    : never);
