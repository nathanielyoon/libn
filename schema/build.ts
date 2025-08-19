import type { FORMAT, Intersect, Type } from "./json.ts";

type With<A extends Type, B extends PropertyKey, C> =
  Omit<A, B> & { [_ in B]-?: C } extends infer D
    ? D extends {} ? { [E in keyof D]: D[E] } : never
    : never;
/** JSON schema builder. */
export type Builder<A extends Type> =
  & Intersect<
    Type<A["type"]> extends infer B ? B extends {} ? {
          [C in keyof Omit<B, keyof A>]-?: C extends "uniqueItems"
            ? () => Builder<With<A, C, true>>
            : C extends "required"
              ? A extends { properties: infer D }
                ? <const E extends readonly (keyof D)[]>(
                  $: E,
                ) => Builder<With<A, C, E>>
              : never
            : <const D extends NonNullable<B[C]>>(
              $: D,
            ) => C extends "const" | "enum"
              ? Pick<Builder<With<A, C, D>>, "type">
              : Omit<Builder<With<A, C, D>>, "const" | "enum">;
        }
      : never
      : never
  >
  & { type: A };
const builder = (base: any) =>
  new Proxy(base, {
    get: (target, key, proxy) =>
      key === "type" ? target : (value: any) => (target[key] = value, proxy),
  });
/** Creates a boolean schema builder. */
export const bit = (): Builder<{ type: "boolean" }> =>
  builder({ type: "boolean" });
/** Creates a integer schema builder. */
export const int = (): Builder<{ type: "integer" }> =>
  builder({ type: "integer" });
/** Creates a number schema builder. */
export const num = (): Builder<{ type: "number" }> =>
  builder({ type: "number" });
/** Creates a string schema builder. */
export const str = (): Builder<{ type: "string" }> =>
  builder({ type: "string" });
/** Creates a vector schema builder. */
export const vec = <
  const A extends
    | Type<"boolean" | "integer" | "number">
    | Type<"string"> & { format: keyof typeof FORMAT },
>(items: Builder<A>): Builder<{ type: "array"; items: A }> =>
  builder({ type: "array", items: items.type });
/** Creates an array schema builder. */
export const arr = <const A extends Type, const B extends number>(
  items: Builder<A>,
  max: B,
): Builder<{ type: "array"; items: A; maxItems: B }> =>
  builder({ type: "array", items: items.type, maxItems: max });
/** Creates a map schema builder. */
export const map = <
  const A extends Type,
  const B extends number,
>(key: RegExp, value: Builder<A>, max: B): Builder<{
  type: "object";
  patternProperties: { [pattern: string]: A };
  additionalProperties: false;
  maxProperties: B;
}> =>
  builder({
    type: "object",
    patternProperties: { [key.source]: value.type },
    additionalProperties: false,
    maxProperties: max,
  });
/** Creates an object schema builder. */
export const obj = <const A extends { [key: string]: Type }>(
  properties: { [B in keyof A]: Builder<A[B]> },
): Builder<{ type: "object"; properties: A; additionalProperties: false }> =>
  builder({
    type: "object",
    properties: Object.keys(properties).reduce((to, key) => {
      to[key] = properties[key].type;
      return to;
    }, {} as { [key: string]: Type }),
    additionalProperties: false,
  });
