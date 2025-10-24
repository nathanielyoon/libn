/**
 * @example
 * ```ts
 * import { assertEquals, assertMatch } from "@std/assert";
 *
 * const binary = new Uint8Array([72, 101, 108, 108, 111, 32, 58, 41]);
 * assertEquals(enC32(binary), "91JPRV3F40X2J");
 * assertEquals(deC32("91JPRV3F40X2J"), binary);
 *
 * assertMatch(enC32(crypto.getRandomValues(new Uint8Array(100))), C32);
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
