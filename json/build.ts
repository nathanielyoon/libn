import type { Type } from "./schema.ts";

type With<A extends Type, B extends PropertyKey, C = true> =
  Omit<A, B> & { [_ in B]-?: C } extends infer D
    ? D extends {} ? { [E in keyof D]: D[E] } : never
    : never;
type Typer<A extends Type> =
  & { type: A }
  & (Type<A["type"]> extends infer B ? B extends {} ?
        | {
          [C in Exclude<keyof B, keyof A>]-?: C extends "uniqueItems"
            ? () => Typer<With<A, C>>
            : <const D extends NonNullable<B[C]>>($: D) => Typer<With<A, C, D>>;
        }
        | (A extends { type: "object"; additionalProperties: false } ? {
            additionalProperties: () => Typer<With<A, "additionalProperties">>;
          }
          : never)
    : never
    : never);
const typer = (type: Type["type"], base: any = {}) =>
  new Proxy({ type, ...base }, {
    get: (target: any, key: string, proxy: any) =>
      key === "type" ? target : ($: any) => (target[key] = $ ?? true, proxy),
  });
/** Creates a boolean schema. */
export const boolean = (): Typer<{ type: "boolean" }> => typer("boolean");
/** Creates a number schema. */
export const number = (): Typer<{ type: "number" }> => typer("number");
/** Creates a string schema. */
export const string = (): Typer<{ type: "string" }> => typer("string");
/** Creates an array schema. */
export const array = <const A extends Type, const B extends number>(
  type: { type: A },
  max: B,
): Typer<{ type: "array"; items: A; maxItems: B }> =>
  typer("array", { items: type.type, maxItems: max });
type Intersect<A> = (A extends never ? never : (_: A) => void) extends
  (_: infer B) => void ? B : never;
type Tuple<A> = Intersect<A extends never ? never : (_: A) => A> extends
  ((_: never) => infer B extends A) ? [...Tuple<Exclude<A, B>>, B] : [];
/** Creates an object schema. */
export const object:
  & (<
    const A extends { [key: string]: Type },
    const B extends [keyof A & string, ...(keyof A & string)[]] = Extract<
      Tuple<keyof A & string>,
      [keyof A & string, ...(keyof A & string)[]]
    >,
  >(types: { readonly [C in keyof A]: { type: A[C] } }, required?: B) => Typer<
    { type: "object"; properties: A; required: B; additionalProperties: false }
  >)
  & { keys: <A extends Type<"object">>($: A) => Tuple<keyof A["properties"]> } =
    Object.defineProperty<any>(
      (types: { [key: string]: { type: Type } }, required?: string[]) =>
        typer("object", {
          properties: Object.keys(types).reduce((to, key) => {
            to[key] = types[key].type;
            return to;
          }, {} as { [key: string]: Type }),
          required: required ?? Object.keys(types),
          additionalProperties: false,
        }),
      "keys",
      ($: Type<"object">) => Object.keys($.properties),
    );
