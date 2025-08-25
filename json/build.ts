import type { Type } from "./schema.ts";

type To<A extends Type, B extends PropertyKey, C = true> =
  Omit<A, B> & { [_ in B]-?: C } extends infer D
    ? D extends {} ? { [E in keyof D]: D[E] } : never
    : never;
type Intersect<A> = (A extends never ? never : (_: A) => void) extends
  (_: infer B) => void ? B : never;
type Tuple<A> = Intersect<A extends never ? never : (_: A) => A> extends
  ((_: never) => infer B extends A) ? [...Tuple<Exclude<A, B>>, B] : [];
type Typer<A extends Type> =
  & { type: A }
  & (Type<A["type"]> extends infer B ? B extends {} ? {
        [
          C in Exclude<
            keyof B,
            | keyof A
            | "items"
            | "uniqueItems"
            | "properties"
            | "required"
            | "additionalProperties"
          >
        ]-?: <const D extends NonNullable<B[C]>>($: D) => Typer<To<A, C, D>>;
      }
    : never
    : never)
  & (A["type"] extends "array"
    ? A extends { items: Type } ? A extends { uniqueItems: boolean } ? {}
      : { uniqueItems: () => Typer<To<A, "uniqueItems">> }
    : {
      items: <const B extends Type>($: { type: B }) => Typer<To<A, "items", B>>;
    }
    : {})
  & (A["type"] extends "object"
    ? A extends { properties: infer B extends { [key: string]: Type } } ?
        & (A extends { required: readonly string[] } ? {} : {
          required: {
            (): Typer<To<A, "required", Tuple<keyof B & string>>>;
            <const C extends [keyof B, ...(keyof B)[]]>(
              $: C,
            ): Typer<To<A, "required", C>>;
          };
        })
        & (A extends { additionalProperties: false } ? {
            additionalProperties: () => Typer<To<A, "additionalProperties">>;
          }
          : {})
    : {
      properties: <const B extends { [key: string]: Type } = {}>(
        $: { readonly [C in keyof B]: { type: B[C] } },
      ) => Typer<To<A, "properties", B>>;
    }
    : {});
const typer = (type: Type["type"], base: any = {}) =>
  new Proxy({ type, ...base }, {
    get: (target: any, key: string, proxy: any) =>
      key === "type" ? target : ($: any) => {
        switch (key) {
          case "items":
            target[key] = $.type;
            break;
          case "properties":
            target[key] = Object.keys($).reduce((to, key) => {
              to[key] = $[key].type;
              return to;
            }, {} as { [key: string]: Type });
            break;
          case "uniqueItems":
          case "additionalProperties":
            target[key] = true;
            break;
          case "required":
            target[key] = $ ?? Object.keys(target.properties);
            break;
          default:
            target[key] = $;
            break;
        }
        return proxy;
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
export const object:
  & (() => Typer<{ type: "object"; additionalProperties: false }>)
  & { keys: <A extends Type<"object">>($: A) => Tuple<keyof A["properties"]> } =
    Object.defineProperty<any>(
      () => typer("object", { additionalProperties: false }),
      "keys",
      { value: ($: Type<"object">) => Object.keys($.properties ?? {}) },
    );
