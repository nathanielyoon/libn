import {
  type Base,
  type Formats,
  type Join,
  KINDS,
  type Media,
  type Some,
  type Tuple,
  type Type,
} from "./schema.ts";

type With<A extends Type, B extends PropertyKey, C> =
  Omit<A, B> & { [_ in B]-?: C } extends infer D
    ? D extends {} ? { [E in keyof D]: D[E] } : never
    : never;
type Typer<A extends Type> =
  & (Type<A["kind"]> extends infer B ? B extends {} ? Join<
        | {
          [C in Exclude<keyof B, keyof A>]-?: C extends "uniqueItems"
            ? () => Typer<With<A, C, true>>
            : <const D extends NonNullable<B[C]>>($: D) => Typer<With<A, C, D>>;
        }
        | (A extends { kind: "obj"; additionalProperties: false } ? {
            additionalProperties: () => Typer<
              With<A, "additionalProperties", true>
            >;
          }
          : never)
      >
    : never
    : never)
  & { type: A };
const handler = {
  get: (target: any, key: string, proxy: any) =>
    key === "type" ? target : ($: any) => (target[key] = $ ?? true, proxy),
};
const typer = (kind: keyof typeof KINDS, base: any = {}) =>
  new Proxy({ type: KINDS[kind], kind, ...base }, handler);
/** Creates a boolean schema. */
export const bit = (): Typer<{ type: "boolean"; kind: "bit" }> => typer("bit");
/** Creates a integer schema. */
export const int = (): Typer<{ type: "integer"; kind: "int" }> => typer("int");
/** Creates a number schema. */
export const num = (): Typer<{ type: "number"; kind: "num" }> => typer("num");
/** Creates a formatted string schema. */
export const fmt = <const A extends keyof Formats>(
  format: A,
): Typer<{ type: "string"; kind: "fmt"; format: A }> =>
  typer("fmt", { format });
/** Creates an encoded string schema. */
export const bin = <
  const A extends Base,
  const B extends Media = "application/octet-stream",
>(base: A, media?: B): Typer<{
  type: "string";
  kind: "bin";
  contentEncoding: A;
  contentMediaType: B;
}> =>
  typer("bin", {
    contentEncoding: base,
    contentMediaType: media ?? "application/octet-stream",
  });
/** Creates a string schema. */
export const str = (): Typer<{ type: "string"; kind: "str" }> => typer("str");
/** Creates a tuple schema. */
export const ord = <const A extends readonly [Type, ...Type[]]>(
  types: { [B in keyof A]: A[B] extends Type ? { type: A[B] } : never },
): Typer<{
  type: "array";
  kind: "ord";
  prefixItems: A;
  minItems: A["length"];
  maxItems: A["length"];
}> =>
  typer("ord", {
    prefixItems: types.map(($) => $.type),
    minItems: types.length,
    maxItems: types.length,
  });
/** Creates a vector schema. */
export const vec = <
  const A extends Type<"bit" | "int" | "num" | "fmt" | "bin">,
>(type: { type: A }): Typer<{ type: "array"; kind: "vec"; items: A }> =>
  typer("vec", { items: type.type });
/** Creates an array schema. */
export const arr = <const A extends Type, const B extends number>(
  type: { type: A },
  max: B,
): Typer<{ type: "array"; kind: "arr"; items: A; maxItems: B }> =>
  typer("arr", { items: type.type, maxItems: max });
/** Creates a map schema. */
export const map = <
  const A extends Type,
  const B extends number,
>(key: RegExp, type: { type: A }, max: B): Typer<{
  type: "object";
  kind: "map";
  patternProperties: { [key: string]: A };
  maxProperties: B;
  additionalProperties: false;
}> =>
  typer("map", {
    patternProperties: { [key.source]: type.type },
    maxProperties: max,
    additionalProperties: false,
  });
/** Creates an object schema. */
export const obj = <
  const A extends { [key: string]: Type },
  const B extends Some<keyof A & string> = Extract<
    Tuple<keyof A & string>,
    Some<keyof A & string>
  >,
>(types: { readonly [C in keyof A]: { type: A[C] } }, required?: B): Typer<{
  type: "object";
  kind: "obj";
  properties: A;
  required: B;
}> =>
  typer("obj", {
    properties: Object.keys(types).reduce((to, key) => {
      to[key] = types[key].type;
      return to;
    }, {} as { [key: string]: Type }),
    required: required ?? Object.keys(types),
  });
