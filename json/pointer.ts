import { isArray, type Json } from "./lib.ts";
import type { Schema } from "./schema.ts";

/** @internal */
type Replace<A, B extends string, C extends string> = A extends
  `${infer D}${B}${infer E}` ? `${D}${C}${Replace<E, B, C>}` : A & string;
/** @internal */
type EnToken<A> = Replace<Replace<A, "~", "~0">, "/", "~1">;
/** @internal */
type DeToken<A> = Replace<Replace<A, "~1", "/">, "~0", "~">;
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
  : A extends { const: Json } ? `${B}/const~${C}`
  : A extends { enum: readonly Json[] } ? `${B}/enum~${C}`
  : A["type"] extends "null" | "boolean" | "integer" | "number" | "string"
    ? `${B}/${Extract<keyof A, string>}~${C}`
  : A["type"] extends "array" ?
      | (A extends { minItems: true } ? `${B}/minItems~${C}` : never)
      | (A extends { maxItems: true } ? `${B}/maxItems~${C}` : never)
      | (A extends { uniqueItems: true } ? `${B}/uniqueItems~${C}` : never)
      | ((A extends { prefixItems: infer D extends readonly Schema[] } ?
          | {
            [E in keyof D]: Pointer<D[E], `${B}/prefixItems/${E}`, `${C}/${E}`>;
          }[keyof D]
          | `${B}/items~${C}`
        : A extends { items: infer D extends Schema }
          ? Pointer<D, `${B}/items`, `${C}/number`>
        : never) extends infer D ? D extends string ? D : never : never)
  :
    | (A extends { minProperties: number } ? `${B}/minProperties~${C}` : never)
    | (A extends { maxProperties: number } ? `${B}/maxProperties~${C}` : never)
    | ((A extends { oneOf: infer D extends readonly Schema[] } ?
        | `${B}/required/0~${C}`
        | { [E in keyof D]: Pointer<D[E], `${B}/oneOf/${E}`, C> }[keyof D]
      : A extends {
        properties: infer D extends { [_: string]: Schema };
        required: infer E extends readonly string[];
      } ?
          | `${B}/required/${Extract<keyof E, number>}~${C}`
          | {
            [F in keyof D]: Pointer<
              D[F],
              `${B}/properties/${EnToken<F>}`,
              `${C}/${EnToken<F>}`
            >;
          }[keyof D]
      : A extends { additionalProperties: infer D extends Schema } ?
          | (A extends { propertyNames: infer E extends Schema }
            ? Pointer<E, `${B}/propertyNames`, `${C}/${string}`>
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
