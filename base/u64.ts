/**
 * @example
 * ```ts
 * import { assertEquals, assertMatch } from "@std/assert";
 *
 * const binary = new Uint8Array([72, 101, 108, 108, 111, 32, 58, 41]);
 * assertEquals(enU64(binary), "SGVsbG8gOik");
 * assertEquals(deU64("SGVsbG8gOik"), binary);
 *
 * assertMatch(enU64(crypto.getRandomValues(new Uint8Array(100))), U64);
 * ```
 *
 * @module u64
 */

import { de64, type Decode, type Encode, map } from "./lib.ts";

const U64_STR =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
/** Converts binary to base64url. */
export const enU64: Encode = ($) => {
  let string = "";
  for (let z = 0; z < $.length; z += 3) {
    const a = $[z], b = $[z + 1], c = $[z + 2];
    string += U64_STR[a >> 2] + U64_STR[a << 4 & 48 | b >> 4] +
      U64_STR[b << 2 & 60 | c >> 6] + U64_STR[c & 63];
  }
  return string.slice(0, Math.ceil($.length / 3 * 4));
};
/** Converts base64url to binary. */
export const deU64: Decode = /* @__PURE__ */
  de64.bind(null, /* @__PURE__ */ map(U64_STR));
/** Decodable base64url. */
export const U64 = /^(?:[-\w]{4})*(?:[-\w]{2,3})?$/;
