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
  `${infer D}${A & string}${infer E}` ? `${D}~${B}${Esc<A, B, E>}` : C & string;
type Base =
  | "type"
  | "enum"
  | `${"min" | "max"}${"imum" | "Length" | "Items"}`
  | "multipleOf"
  | "format"
  | "pattern";
type Intersect<A> = (A extends never ? never : (_: A) => void) extends
  (_: infer B) => void ? B : never;
/** Union of error indicators. */
export type Fail<A extends Type, B extends string = ""> =
  Exclude<keyof A, "title" | "description"> extends infer C
    ? C extends keyof A
      ? A[C] extends infer D ? D extends Type ? Fail<D, `${B}/${number}`>
        : D extends { [key: string]: Type }
          ? keyof D extends infer E
            ? E extends keyof D
              ? Fail<D[E], `${B}/${Esc<"/", 1, Esc<"~", 0, E>>}`>
            : never
          : never
        : {
          path: B;
          raw: unknown;
          error: [C, [C, D] extends ["required", readonly (infer E)[]] ? E : D];
        }
      : never
    : never
    : never;
