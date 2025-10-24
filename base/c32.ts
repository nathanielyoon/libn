/**
 * [Crockford base 32](https://crockford.com/base32) uses digits and uppercase
 * letters, excluding "I", "L", "O", and "U". Encoding is always uppercase, and
 * decoding is case-insensitive, and additionally accepts hyphens (which don't
 * affect the output) and substitutes "I", "L", and "O" characters for their
 * similar-looking numeric counterparts ("1", "1", and "0", respectively).
 *
 * @example Usage
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * const binary = new TextEncoder().encode("Hello :)");
 *
 * // Encode!
 * assertEquals(enC32(binary), "91JPRV3F40X2J");
 *
 * // Decode!
 * assertEquals(deC32("91JPRV3F40X2J"), binary);
 * ```
 *
 * @module c32
 */

import { de32, type Decode, en32, type Encode, map } from "./lib.ts";
import { en } from "./utf.ts";

const C32_STR = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const C32_BIN = /* @__PURE__ */ (() => {
  const bin = map(C32_STR, 32);
  for (const $ of "Oo") bin[en.call($)] = 0;
  for (const $ of "IiLl") bin[en.call($)] = 1;
  return bin;
})();
/** Converts binary to Crockford base 32. */
export const enC32: Encode = /* @__PURE__ */ en32.bind(null, C32_STR);
/** Converts Crockford base 32 to binary. */
export const deC32: Decode = ($) => de32(C32_BIN, $.replace(/-+/g, ""));
/** Decodable Crockford base32. */
export const C32 = /^[-\dA-TV-Za-tv-z]*$/;
