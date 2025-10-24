/**
 * @example
 * ```ts
 * import { assertEquals, assertMatch } from "@std/assert";
 *
 * const binary = new Uint8Array([72, 101, 108, 108, 111, 32, 58, 41]);
 * assertEquals(enH32(binary), "91IMOR3F40T2I");
 * assertEquals(deH32("91IMOR3F40T2I"), binary);
 *
 * assertMatch(enH32(crypto.getRandomValues(new Uint8Array(100))), H32);
 * ```
 *
 * @module h32
 */

import { de32, type Decode, en32, type Encode, map } from "./lib.ts";

const H32_STR = "0123456789ABCDEFGHIJKLMNOPQRSTUV";
/** Converts binary to base32hex. */
export const enH32: Encode = /* @__PURE__ */ en32.bind(null, H32_STR);
/** Converts base32hex to binary (case-insensitively). */
export const deH32: Decode = /* @__PURE__ */
  de32.bind(null, /* @__PURE__ */ map(H32_STR, 32));
/** Decodable base32hex. */
export const H32 = /^[\dA-Va-v]*$/;
