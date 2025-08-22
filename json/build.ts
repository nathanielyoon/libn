import type { Data, Formats, Intersect, Type } from "./json.ts";

type With<A extends Type, B extends PropertyKey, C> =
  Omit<A, B> & { [_ in B]-?: C } extends infer D
    ? D extends {} ? { [E in keyof D]: D[E] } : never
    : never;
type Tuple<A> = Intersect<A extends never ? never : (_: A) => A> extends
  (_: never) => infer B ? [...Tuple<Exclude<A, B>>, B] : [];
type Keys<A> = readonly [keyof A & string, ...(keyof A & string)[]];
/** Gets exactly-typed keys. */
export const keys = Object.keys as unknown as <
  A extends Type<"obj"> = never,
>($: Data<A> | A["properties"]) => Keys<typeof $>;
/** JSON schema builder. */
export type Typer<A extends Type> =
  & (Type<A["kind"]> extends infer B ? B extends {} ? Intersect<
        {
          [C in keyof Omit<B, keyof A>]-?: C extends "uniqueItems"
            ? () => Typer<With<A, C, true>>
            : <const D extends NonNullable<B[C]>>($: D) => Typer<With<A, C, D>>;
        }
      >
    : never
    : never)
  & { type: A };
const typer = (base: any) =>
  new Proxy(base, {
    get: (target, key, proxy) =>
      key === "type"
        ? target
        : (value: any) => (target[key] = value ?? true, proxy),
  });
/** Creates a boolean schema builder. */
export const bit = (): Typer<{ kind: "bit"; type: "boolean" }> =>
  typer({ kind: "bit", type: "boolean" });
/** Creates a integer schema builder. */
export const int = (): Typer<{ kind: "int"; type: "integer" }> =>
  typer({ kind: "int", type: "integer" });
/** Creates a number schema builder. */
export const num = (): Typer<{ kind: "num"; type: "number" }> =>
  typer({ kind: "num", type: "number" });
/** Creates a string schema builder. */
export const str = <const A extends keyof Formats>(
  format: A,
): Typer<{ kind: "str"; type: "string"; format: A }> =>
  typer({ kind: "str", type: "string", format });
/** Creates a text schema builder. */
export const txt = (): Typer<{ kind: "txt"; type: "string" }> =>
  typer({ kind: "txt", type: "string" });
/** Creates a vector schema builder. */
export const vec = <
  const A extends Type<"bit" | "int" | "num" | "str">,
>(items: { type: A }): Typer<{ kind: "vec"; type: "array"; items: A }> =>
  typer({ kind: "vec", type: "array", items: items.type });
/** Creates an array schema builder. */
export const arr = <const A extends Type, const B extends number>(
  items: { type: A },
  max: B,
): Typer<{ kind: "arr"; type: "array"; items: A; maxItems: B }> =>
  typer({ kind: "arr", type: "array", items: items.type, maxItems: max });
/** Creates a map schema builder. */
export const map = <
  const A extends Type,
  const B extends number,
>(key: RegExp, value: { type: A }, max: B): Typer<{
  kind: "map";
  type: "object";
  patternProperties: { [pattern: string]: A };
  maxProperties: B;
  additionalProperties: false;
}> =>
  typer({
    kind: "map",
    type: "object",
    patternProperties: { [key.source]: value.type },
    maxProperties: max,
    additionalProperties: false,
  });
/** Creates an object schema builder. */
export const obj = <
  const A extends { [key: string]: Type },
  const B extends Keys<A> | readonly [],
>(properties: { readonly [C in keyof A]: { type: A[C] } }, required: B): Typer<{
  kind: "obj";
  type: "object";
  properties: A;
  required: B extends readonly []
    ? Tuple<keyof A> extends infer C ? C extends Keys<A> ? C : never : never
    : B;
  additionalProperties: false;
}> =>
  typer({
    kind: "obj",
    type: "object",
    properties: Object.keys(properties).reduce((to, key) => {
      to[key] = properties[key].type;
      return to;
    }, {} as { [key: string]: Type }),
    required: required ?? Object.keys(properties),
    additionalProperties: false,
  });
