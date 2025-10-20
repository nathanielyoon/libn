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
export type Pointer<A extends Schema, B extends [string, string] = ["", ""]> = {
  [C in keyof A]: [C, A[C]] extends ["items", infer D extends Schema]
    ? Pointer<D, [`${B[0]}/items`, `${B[1]}/${number}`]>
    : [C, A[C]] extends ["prefixItems", infer D extends readonly Schema[]] ? {
        [E in keyof D]: Pointer<
          D[E],
          [`${B[0]}/prefixItems/${E}`, `${B[1]}/${E}`]
        >;
      }[keyof D]
    : [C, A[C]] extends ["patternProperties", infer D extends Schema] ? {
        [E in keyof D]: Pointer<
          D,
          [`${B[0]}/patternProperties/${EnToken<E>}`, `${B[1]}/${string}`]
        >;
      }
    : [C, A[C]] extends ["properties", infer D extends { [_: string]: Schema }]
      ? {
        [E in keyof D]: Pointer<
          D[E],
          [`${B[0]}/properties/${EnToken<E>}`, `${B[1]}/${EnToken<E>}`]
        >;
      }[keyof D]
    : [C, A[C]] extends ["required", infer D extends readonly string[]] ? {
        [E in keyof D]: `${B[0]}/required/${E}~${B[1]}/${EnToken<D[E]>}`;
      }[keyof D]
    : `${B[0]}/${C & string}~${B[1]}`;
}[keyof A] extends infer C ? C extends string ? C : never : never;
/** Resolves a JSON pointer. */
export const get = ($: Json, pointer: string) => {
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
