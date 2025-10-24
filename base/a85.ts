/**
 * @example
 * ```ts
 * import { assertEquals, assertMatch } from "@std/assert";
 *
 * const binary = new Uint8Array([72, 101, 108, 108, 111, 32, 58, 41]);
 * assertEquals(enA85(binary), "87cURD]h(i");
 * assertEquals(deA85("87cURD]h(i"), binary);
 *
 * assertMatch(enA85(crypto.getRandomValues(new Uint8Array(100))), A85);
 * ```
 *
 * @module a85
 */

import { de85, type Decode, en85, type Encode, map } from "./lib.ts";

const A85_STR =
  "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstu";
const A85_BIN = /* @__PURE__ */ map(A85_STR);
/** Converts binary to Ascii85. */
export const enA85: Encode = ($) =>
  ($.length & 3
    ? en85(A85_STR, $).slice(0, ($.length & 3) - 4)
    : en85(A85_STR, $)).replace(/(?<=^(?:[!-u]{5})*)!{5}/g, "z");
/** Converts Ascii85 to binary. */
export const deA85: Decode = ($) => {
  const as = $.replace(/\s+/g, "").replaceAll("z", "!!!!!"), to = as.length % 5;
  return to
    ? new Uint8Array(de85(A85_BIN, as + "u".repeat(5 - to)).subarray(0, to - 5))
    : de85(A85_BIN, as);
};
/** Decodable Ascii85. */
export const A85 = /^[!-uz]*$/;
