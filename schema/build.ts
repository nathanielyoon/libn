import type { FORMAT, Schema } from "./json.ts";

type With<A extends Schema, B extends PropertyKey, C> =
  Omit<A, B> & { [_ in B]-?: C } extends infer D
    ? D extends {} ? { [E in keyof D]: D[E] } : never
    : never;
type Intersect<A> = (A extends never ? never : (_: A) => void) extends
  (_: infer B) => void ? B : never;
/** JSON schema builder. */
export type Builder<A extends Schema> =
  & Intersect<
    Schema<A["type"]> extends infer B ? B extends {} ? {
          [C in keyof Omit<B, keyof A>]-?: C extends "uniqueItems"
            ? () => Builder<With<A, C, true>>
            : C extends "required"
              ? B extends { properties: {} }
                ? <const D extends readonly (keyof B["properties"])[]>(
                  $: D,
                ) => Builder<With<A, C, D>>
              : never
            : <const D extends NonNullable<B[C]>>(
              $: D,
            ) => C extends "const" | "enum"
              ? Pick<Builder<With<A, C, D>>, "schema">
              : Omit<Builder<With<A, C, D>>, "const" | "enum">;
        }
      : never
      : never
  >
  & { schema: A };
const builder = (base: any) =>
  new Proxy(base, {
    get: (target, key, proxy) =>
      key === "schema" ? target : (value: any) => (target[key] = value, proxy),
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
    | Schema<"boolean" | "number">
    | Schema<"string"> & { format: keyof typeof FORMAT },
>(items: Builder<A>): Builder<{ type: "array"; items: A }> =>
  builder({ type: "array", items: items.schema });
/** Creates an array schema builder. */
export const arr = <const A extends Schema, const B extends number>(
  items: Builder<A>,
  max: B,
): Builder<{ type: "array"; items: A; maxItems: B }> =>
  builder({ type: "array", items: items.schema, maxItems: max });
/** Creates a map schema builder. */
export const map = <
  const A extends { [pattern: string]: Schema },
  const B extends number,
>(patterns: { [C in keyof A]: Builder<A[C]> }, max: B): Builder<{
  type: "object";
  patternProperties: A;
  additionalProperties: false;
  maxProperties: B;
}> =>
  builder({
    type: "object",
    patternProperties: Object.keys(patterns).reduce(
      (to, key) => ({ ...to, [key]: patterns[key].schema }),
      {},
    ),
    additionalProperties: false,
    maxProperties: max,
  });
/** Creates an object schema builder. */
export const obj = <const A extends { [key: string]: Schema }>(
  properties: { [B in keyof A]: Builder<A[B]> },
): Builder<{ type: "object"; properties: A; additionalProperties: false }> =>
  builder({
    type: "object",
    properties: Object.keys(properties).reduce(
      (to, key) => ({ ...to, [key]: properties[key].schema }),
      {},
    ),
    additionalProperties: false,
  });
