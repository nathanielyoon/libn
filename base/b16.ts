/**
 * [Base16](https://www.rfc-editor.org/rfc/rfc4648#section-8) uses hexadecimal
 * characters ("0-9" and "A-F"). Encoding is always uppercase (diverging from
 * [Number.prototype.toString](https://dev.mozilla.org/Web/JavaScript/Reference/Global_Objects/Number/toString)
 * and
 * [Uint8Array.prototype.toHex](https://dev.mozilla.org/Web/JavaScript/Reference/Global_Objects/Uint8Array/toHex),
 * which use lowercase "a-f"), and decoding is case-insensitive.
 *
 * @example Usage
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * const binary = new TextEncoder().encode("Hello :)");
 *
 * // Encode!
 * assertEquals(enB16(binary), "48656C6C6F203A29");
 *
 * // Decode!
 * assertEquals(deB16("48656C6C6F203A29"), binary);
 * ```
 *
 * @module b16
 */

import { type Decode, type Encode, map } from "./lib.ts";
import { en } from "./utf.ts";

const B16_STR = /* @__PURE__ */ Array.from(
  { length: 256 },
  (_, byte) => byte.toString(16).toUpperCase().padStart(2, "0"),
);
const B16_BIN = /* @__PURE__ */ map("0123456789ABCDEF", 32);
/** Converts binary to base16. */
export const enB16: Encode = ($) => {
  let string = "";
  for (let z = 0; z < $.length; ++z) string += B16_STR[$[z]];
  return string;
};
/** Converts base16 to binary. */
export const deB16: Decode = ($) => {
  const binary = new Uint8Array($.length >> 1);
  for (let z = 0; z < $.length; z += 2) {
    binary[z >> 1] = B16_BIN[en.call($, z)] << 4 | B16_BIN[en.call($, z + 1)];
  }
  return binary;
};
/** Decodable base16. */
export const B16 = /^(?:[\dA-Fa-f]{2})*$/;
