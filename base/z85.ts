/**
 * [Z85](https://rfc.zeromq.org/spec/32) uses printable, non-whitespace ASCII
 * characters, excluding '"', "'", ",", ";", "\", "_", "`", "|", and "~". Unlike
 * the [original](https://rfc.zeromq.org/spec/32/#formal-specification), the
 * binary input length doesn't have to be a multiple of 4, the encoding and
 * decoding functions add and remove padding automatically.
 *
 * @example Usage
 * ```ts
 * import { assertEquals, assertMatch } from "@std/assert";
 *
 * const binary = new TextEncoder().encode("Hello :)");
 *
 * // Encode!
 * assertEquals(enZ85(binary), "nm=QNzY?7&");
 *
 * // Decode!
 * assertEquals(deZ85("nm=QNzY?7&"), binary);
 * ```
 *
 * @module z85
 */

import { de85, type Decode, en85, type Encode, map } from "./lib.ts";

const Z85_STR =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#";
/** Converts binary to Z85. */
export const enZ85: Encode = /* @__PURE__ */ en85.bind(null, Z85_STR);
/** Converts Z85 to binary. */
export const deZ85: Decode = /* @__PURE__ */
  de85.bind(null, /* @__PURE__ */ map(Z85_STR));
/** Decodable Z85. */
export const Z85 = /^[!#-&(-+--:<-[\]^a-{}]*$/;
