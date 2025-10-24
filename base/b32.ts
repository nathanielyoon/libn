/**
 * [Base32](https://www.rfc-editor.org/rfc/rfc4648#section-6) uses uppercase
 * letters and digits, excluding "0", "1", "8", and "9". Encoding is always
 * uppercase, and decoding is case-insensitive.
 *
 * @example Usage
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * const binary = new TextEncoder().encode("Hello :)");
 *
 * // Encode!
 * assertEquals(enB32(binary), "JBSWY3DPEA5CS");
 *
 * // Decode!
 * assertEquals(deB32("JBSWY3DPEA5CS"), binary);
 * ```
 *
 * @module b32
 */

import { de32, type Decode, en32, type Encode, map } from "./lib.ts";

const B32_STR = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
/** Converts binary to base32. */
export const enB32: Encode = /* @__PURE__ */ en32.bind(null, B32_STR);
/** Converts base32 to binary. */
export const deB32: Decode = /* @__PURE__ */
  de32.bind(null, /* @__PURE__ */ map(B32_STR, 32));
/** Decodable base32. */
export const B32 = /^[2-7A-Za-z]*$/;
