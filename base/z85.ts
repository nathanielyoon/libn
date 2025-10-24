/**
 * @example
 * ```ts
 * import { assertEquals, assertMatch } from "@std/assert";
 *
 * const binary = new Uint8Array([72, 101, 108, 108, 111, 32, 58, 41]);
 * assertEquals(enZ85(binary), "nm=QNzY?7&");
 * assertEquals(deZ85("nm=QNzY?7&"), binary);
 *
 * assertMatch(enZ85(crypto.getRandomValues(new Uint8Array(100))), Z85);
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
export const Z85 = /^[!#-&(-+--:<-[\]^a-}]*$/;
