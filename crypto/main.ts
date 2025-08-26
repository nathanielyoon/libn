/**
 * Hash, sign, verify, exchange, derive, encrypt, and decrypt.
 * @module crypto
 *
 * @example
 * ```ts
 * import {
 *   generate,
 *   hkdf,
 *   hmac,
 *   polyxchacha,
 *   sha256,
 *   sha512,
 *   sign,
 *   verify,
 *   x25519,
 *   xchachapoly,
 * } from "@nyoon/lib/crypto";
 * import { assert, assertEquals } from "jsr:@std/assert@^1.0.14";
 *
 * const key_1 = crypto.getRandomValues(new Uint8Array(32));
 * const key_2 = crypto.getRandomValues(new Uint8Array(32));
 * const data = crypto.getRandomValues(new Uint8Array(100));
 * const empty = new Uint8Array(32);
 * assertEquals(
 *   sha256(data),
 *   new Uint8Array(await crypto.subtle.digest("SHA-256", data)),
 * );
 * assertEquals(
 *   sha512(data),
 *   new Uint8Array(await crypto.subtle.digest("SHA-512", data)),
 * );
 * assert(
 *   await crypto.subtle.verify(
 *     "HMAC",
 *     await crypto.subtle.importKey(
 *       "raw",
 *       key_1,
 *       { name: "HMAC", hash: "SHA-256" },
 *       false,
 *       ["verify"],
 *     ),
 *     hmac(key_1, data),
 *     data,
 *   ),
 * );
 * assert(verify(generate(key_2), data, sign(key_2, data)));
 * assertEquals(
 *   hkdf(x25519(key_1, x25519(key_2))),
 *   hkdf(x25519(key_2, x25519(key_1))),
 * );
 * assertEquals(x25519(key_1, empty), empty); // no all-zero check
 * assertEquals(
 *   polyxchacha(
 *     key_1,
 *     key_2.subarray(8),
 *     xchachapoly(key_1, key_2.subarray(8), data, empty) ?? empty,
 *     empty,
 *   ),
 *   data,
 * );
 * ```
 *
 * @see [RFC 6234](https://www.rfc-editor.org/rfc/rfc6234)
 * @see [RFC 2104](https://www.rfc-editor.org/rfc/rfc2104)
 * @see [RFC 8032](https://www.rfc-editor.org/rfc/rfc8032)
 * @see [RFC 7748](https://www.rfc-editor.org/rfc/rfc7748)
 * @see [RFC 5869](https://www.rfc-editor.org/rfc/rfc5869)
 */

export * from "./hash.ts";
export * from "./25519.ts";
export * from "./aead.ts";
