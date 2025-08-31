import type { Type } from "./types.ts";

type To<A extends Type, B extends PropertyKey, C = true> =
  Omit<A, B> & { [_ in B]-?: C } extends infer D
    ? D extends {} ? { [E in keyof D]: D[E] } : never
    : never;
type Intersect<A> = (A extends never ? never : (_: A) => void) extends
  (_: infer B) => void ? B : never;
type Tuple<A extends string> = string extends A ? string[]
  : Intersect<A extends never ? never : (_: A) => A> extends
    ((_: never) => infer B extends A) ? [...Tuple<Exclude<A, B>>, B]
  : [];
type Typer<A extends Type> =
  & { type: A }
  & (Type<A["type"]> extends infer B ? B extends Type ? {
        [C in Exclude<keyof B, "type" | "items" | "properties" | "required">]-?:
          C extends "uniqueItems" | "additionalProperties"
            ? <const D extends boolean = true>($?: D) => Typer<To<A, C, D>>
            : <const D extends NonNullable<B[C]>>($: D) => Typer<To<A, C, D>>;
      }
    : never
    : never)
  & (A["type"] extends "array" ? A extends { items: Type } ? {} : {
      items: <const B extends Type>($: { type: B }) => Typer<To<A, "items", B>>;
    }
    : {})
  & (A["type"] extends "object"
    ? A extends { properties: infer B extends { [key: string]: Type } } ? {
        required: {
          (): Typer<
            To<
              A,
              "required",
              string extends keyof B ? string[] : Tuple<keyof B & string>
            >
          >;
          <const C extends (keyof B & string)[]>(
            $: C,
          ): Typer<To<A, "required", C>>;
        };
      }
    : {
      properties: <const B extends { [key: string]: Type } = {}>(
        $: { readonly [C in keyof B]: { type: B[C] } },
      ) => Typer<To<A, "properties", B>>;
    }
    : {});
const typer = (type: Type["type"], rest: any = {}) =>
  new Proxy(rest, {
    get: (_, key) => {
      switch (key) {
        case "type":
          return { type, ...rest };
        case "items":
          return ($: { type: Type }) => typer(type, { ...rest, items: $.type });
        case "properties":
          return ($: { [key: string]: { type: Type } }) =>
            typer(type, {
              ...rest,
              properties: Object.keys($).reduce(
                (to, key) => ({ ...to, [key]: $[key].type }),
                {},
              ),
            });
        case "required":
          return ($?: string[]) =>
            typer(type, {
              ...rest,
              required: $ ?? Object.keys(rest.properties),
            });
        default:
          return ($: any) => typer(type, { ...rest, [key]: $ ?? true });
      }
    },
  });
/** Creates a boolean schema. */
export const boolean = (): Typer<{ type: "boolean" }> => typer("boolean");
/** Creates a number schema. */
export const number = (): Typer<{ type: "number" }> => typer("number");
/** Creates a string schema. */
export const string = (): Typer<{ type: "string" }> => typer("string");
/** Creates an array schema. */
export const array = (): Typer<{ type: "array" }> => typer("array");
/** Creates an object schema. */
export const object = (): Typer<
  { type: "object"; additionalProperties: false }
> => typer("object", { additionalProperties: false });
