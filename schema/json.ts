/** Valid JSON, but with `undefined` instead of `null`. */
export type Json = undefined | boolean | number | string | Json[] | {
  [key: string]: Json;
};
/** Utility type to convert a union to an intersection. */
export type Intersect<A> = (A extends never ? never : (_: A) => void) extends
  (_: infer B) => void ? B : never;
/** String format types. */
export type Formats = {
  date: `${number}-${number}-${number}`;
  time: `${number}:${number}:${number}.${number}Z`;
  "date-time": `${Formats["date"]}T${Formats["time"]}`;
  email: `${string}@${string}.${string}`;
  uri: `${string}:${string}`; // https://www.rfc-editor.org/rfc/rfc3986.html#appendix-B + required scheme
  uuid: `${string}-${string}-${string}-${string}-${string}`;
  pkey: `~${string}`;
  skey: `.${string}`;
};
type Meta =
  & {
    boolean: { const: boolean } | { enum: readonly [boolean] } | {};
    string: { const: string } | { enum: readonly [string, ...string[]] } | {
      minLength?: number;
      maxLength?: number;
      format?: keyof Formats;
      pattern?: string;
    };
    array: {
      items:
        | Type<"boolean" | "integer" | "number">
        | Type<"string"> & { format: keyof Formats };
      minItems?: number;
      maxItems?: number;
      uniqueItems?: boolean;
    } | { items: Type; minItems?: number; maxItems: number };
    object: {
      patternProperties: { [pattern: string]: Type };
      additionalProperties: false;
      minProperties?: number;
      maxProperties: number;
    } | {
      properties: { [key: string]: Type };
      additionalProperties: false;
      required?: readonly [string, ...string[]];
    };
  }
  & {
    [_ in "integer" | "number"]:
      | { const: number }
      | { enum: readonly [number, ...number[]] }
      | { minimum?: number; maximum?: number; multipleOf?: number };
  };
/** JSON schema (restricted subset). */
export type Type<A extends keyof Meta = keyof Meta> = A extends string
  ? { type: A } & Meta[A]
  : never;
/** Schema-defined data. */
export type Data<A extends Type> = Type extends A ? Json
  : A extends { const: infer B } | { enum: readonly (infer B)[] } ? B
  : A["type"] extends "boolean" ? boolean
  : A["type"] extends "integer" | "number" ? number
  : A extends { format: infer B extends keyof Formats } ? Formats[B]
  : A["type"] extends "string" ? string
  : A extends { items: infer B extends Type } ? readonly Data<B>[]
  : A extends { patternProperties: { [pattern: string]: infer B } }
    ? B extends Type ? { [key: string]: Data<B> } : never
  : A extends { properties: infer B extends { [key: string]: Type } }
    ? A extends { required: readonly (infer C extends string)[] } ? (
        & { [D in Extract<keyof B, C>]: Data<B[D]> }
        & { [D in Exclude<keyof B, C>]?: Data<B[D]> }
      ) extends infer E ? { [F in keyof E]: E[F] } : never
    : { [C in keyof B]?: Data<B[C]> }
  : never;
type Esc<A extends PropertyKey, B extends number, C> = C extends
  `${infer D}${A & string}${infer F}` ? `${D}~${B}${Esc<A, B, F>}` : C & string;
/** Union of error indicators. */
export type Fail<A extends Type, B extends string = ""> = {
  [C in keyof A]: A[C] extends infer D
    ? D extends Type ? Fail<D, `${B}/${number}`>
    : D extends { [key: string]: Type } ? {
        [E in keyof D]: Fail<D[E], `${B}/${Esc<"/", 1, Esc<"~", 0, E>>}`>;
      }[keyof D]
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
