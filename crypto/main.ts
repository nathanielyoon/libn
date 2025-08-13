/**
 * Hash, sign, verify, exchange, and derive.
 *
 * @example
 * ```ts
 * import * as $ from "@nyoon/lib/crypto";
 * import { assert, assertEquals } from "jsr:@std/assert";
 *
 * const key_1 = crypto.getRandomValues(new Uint8Array(32));
 * const key_2 = crypto.getRandomValues(new Uint8Array(32));
 * const data = crypto.getRandomValues(new Uint8Array(100));
 *
 * assertEquals(
 *   $.sha256(data),
 *   new Uint8Array(await crypto.subtle.digest("SHA-256", data)),
 * );
 * assertEquals(
 *   $.sha512(data),
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
 *     $.hmac(key_1, data),
 *     data,
 *   ),
 * );
 * assert($.verify($.generate(key_2), data, $.sign(key_2, data)));
 * assertEquals(
 *   $.hkdf($.x25519(key_1, $.x25519(key_2))),
 *   $.hkdf($.x25519(key_2, $.x25519(key_1))),
 * );
 * ```
 *
 * @see [RFC 6234](https://www.rfc-editor.org/rfc/rfc6234)
 * @see [RFC 2104](https://www.rfc-editor.org/rfc/rfc2104)
 * @see [RFC 8032](https://www.rfc-editor.org/rfc/rfc8032)
 * @see [RFC 7748](https://www.rfc-editor.org/rfc/rfc7748)
 * @see [RFC 5869](https://www.rfc-editor.org/rfc/rfc5869)
 * @module
 */

export * from "./25519.ts";
export * from "./hash.ts";
