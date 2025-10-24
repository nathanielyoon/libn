/**
 * @example
 * ```ts
 * import { assertEquals, assertMatch } from "@std/assert";
 *
 * const binary = new Uint8Array([72, 101, 108, 108, 111, 32, 58, 41]);
 * assertEquals(enB32(binary), "JBSWY3DPEA5CS");
 * assertEquals(deB32("JBSWY3DPEA5CS"), binary);
 *
 * assertMatch(enB32(crypto.getRandomValues(new Uint8Array(100))), B32);
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
