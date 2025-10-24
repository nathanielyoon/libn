/**
 * [Base32hex](https://www.rfc-editor.org/rfc/rfc4648#section-7) uses digits
 * and uppercase letters, excluding "W-Z". Encoding is always uppercase, and
 * decoding is case-insensitive.
 *
 * @example Usage
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * const binary = new TextEncoder().encode("Hello :)");
 *
 * // Encode!
 * assertEquals(enH32(binary), "91IMOR3F40T2I");
 *
 * // Decode!
 * assertEquals(deH32("91IMOR3F40T2I"), binary);
 * ```
 *
 * @module h32
 */

import { de32, type Decode, en32, type Encode, map } from "./lib.ts";

const H32_STR = "0123456789ABCDEFGHIJKLMNOPQRSTUV";
/** Converts binary to base32hex. */
export const enH32: Encode = /* @__PURE__ */ en32.bind(null, H32_STR);
/** Converts base32hex to binary. */
export const deH32: Decode = /* @__PURE__ */
  de32.bind(null, /* @__PURE__ */ map(H32_STR, 32));
/** Decodable base32hex. */
export const H32 = /^[\dA-Va-v]*$/;
