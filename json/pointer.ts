/** @module pointer */
import type { Schema } from "@libn/json/schema";
import { isArray, type Json } from "./lib.ts";

/** @internal */
type Replace<A extends string, B extends string, C extends string> = A extends
  `${infer D}${B}${infer E}` ? `${D}${C}${Replace<E, B, C>}` : A;
/** @internal */
type EnToken<A extends PropertyKey> = Replace<
  Replace<`${Exclude<A, symbol>}`, "~", "~0">,
  "/",
  "~1"
>;
/** @internal */
type DeToken<A extends string> = Replace<Replace<A, "~1", "/">, "~0", "~">;
/** Encodes a reference token. */
export const enToken = <A extends string>($: A) =>
  $.replaceAll("~", "~0").replaceAll("/", "~1") as EnToken<A>;
/** Decodes a reference token. */
export const deToken = <A extends string>($: A) =>
  $.replaceAll("~1", "/").replaceAll("~0", "~") as DeToken<A>;
/** Error indicator. */
export type Pointer<
  A extends Schema,
  B extends string = "",
  C extends string = "",
> = Schema extends A ? `${string}~${string}`
  : A extends { oneOf: [{ type: "null" }, infer D extends Schema] }
    ? Pointer<D, `${B}/oneOf/1`, C>
  : A["type"] extends "null" | "boolean" | "integer" | "number" | "string"
    ? `${B}/${Exclude<keyof A, symbol>}~${C}`
  : A["type"] extends "array" ?
      | `${B}/type~${C}`
      | (A extends { minItems: number } ? `${B}/minItems~${C}` : never)
      | (A extends { maxItems: number } ? `${B}/maxItems~${C}` : never)
      | (A extends { uniqueItems: true } ? `${B}/uniqueItems~${C}` : never)
      | ((A extends { prefixItems: infer D extends readonly Schema[] } ?
          | `${B}/items~${C}`
          | {
            [E in keyof D]: Pointer<D[E], `${B}/prefixItems/${E}`, `${C}/${E}`>;
          }[keyof D]
        : A extends { items: infer D extends Schema }
          ? Pointer<D, `${B}/items`, `${C}/${number}`>
        : never) extends infer D ? D extends string ? D : never : never)
  :
    | `${B}/type~${C}`
    | (A extends { minProperties: number } ? `${B}/minProperties~${C}` : never)
    | (A extends { maxProperties: number } ? `${B}/maxProperties~${C}` : never)
    | ((A extends {
      required: readonly [infer D extends string];
      oneOf: infer E extends readonly Schema[];
    } ?
        | `${B}/required/0~${C}`
        | `${B}/oneOf~${C}`
        | {
          [F in keyof E]: Exclude<
            Pointer<E[F], `${B}/oneOf/${F}`, C>,
            | `${B}/oneOf/${F}/type~${C}`
            | `${B}/oneOf/${F}/properties/${EnToken<D>}/${
              | "type"
              | "const"}~${C}/${EnToken<D>}`
          >;
        }[keyof E]
      : A extends {
        properties: infer D extends { [_: string]: Schema };
        required: infer E extends readonly string[];
      } ?
          | `${B}/required/${Exclude<keyof E, symbol | keyof []>}~${C}`
          | {
            [F in keyof D]: Pointer<
              D[F],
              `${B}/properties/${EnToken<F>}`,
              `${C}/${EnToken<F>}`
            >;
          }[keyof D]
      : A extends { additionalProperties: infer D extends Schema } ?
          | (A extends { propertyNames: infer E extends Schema } ? Exclude<
              Pointer<E, `${B}/propertyNames`, `${C}/${string}`>,
              `${B}/propertyNames/type~${C}/${string}`
            >
            : never)
          | Pointer<D, `${B}/additionalProperties`, `${C}/${string}`>
      : never) extends infer D ? D extends string ? D : never : never);
/** Resolves a JSON pointer. */
export const dereference = ($: Json, pointer: string): Json | undefined => {
  if (!pointer) return $;
  const [head, ...tail] = pointer.split("/");
  if (head) return;
  for (let z = 0; z < tail.length; ++z) {
    if (typeof $ !== "object" || !$) return;
    const token = deToken(tail[z]);
    if (isArray($)) {
      if (!/^(?:[1-9]\d*|0)$/.test(token)) return;
      $ = $[+token];
    } else $ = $[token];
    if ($ === undefined) return;
  }
  return $;
};
