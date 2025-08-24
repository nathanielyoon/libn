type Formats = {
  date: `${number}-${number}-${number}`;
  time: `${number}:${number}:${number}.${number}Z`;
  "date-time": `${Formats["date"]}T${Formats["time"]}`;
  email: `${string}@${string}.${string}`;
  uri: `${string}:${string}`;
  uuid: `${string}-${string}-${string}-${string}-${string}`;
};
type Types = {
  boolean: { enum?: readonly [boolean] };
  number: {
    enum?: readonly [number, ...number[]];
    minimum?: number;
    maximum?: number;
    multipleOf?: number;
  };
  string: {
    enum?: readonly [string, ...string[]];
    minLength?: number;
    maxLength?: number;
    format?: keyof Formats;
    pattern?: string;
  };
  array: {
    items: Type;
    minItems?: number;
    maxItems: number;
    uniqueItems?: boolean;
  };
  object: {
    properties: { [key: string]: Type };
    required: readonly [string, ...string[]];
    additionalProperties?: boolean;
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
  : A extends { format: infer B extends keyof Formats } ? Formats[B]
  : A["type"] extends "string" ? string
  : A extends { items: infer B extends Type } ? readonly Data<B>[]
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
      [C in Exclude<keyof A, "title" | "description" | "properties">]?:
        [C, A[C]] extends ["required", readonly (infer D)[]] ? D[] : A[C];
    };
  }
  | (A extends { items: infer C extends Type } ? Fail<C, `${B}/${number}`>
    : A extends { properties: infer C extends { [key: string]: Type } }
      ? keyof C extends infer D
        ? D extends keyof C ? Fail<C[D], `${B}/${Esc<"/", 1, Esc<"~", 0, D>>}`>
        : never
      : never
    : never);
