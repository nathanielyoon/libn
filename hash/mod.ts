/**
 * SHA-256 and SHA-512 ([RFC 6234](https://www.rfc-editor.org/rfc/rfc6234)),
 * HMAC-SHA256 ([RFC 2104](https://www.rfc-editor.org/rfc/rfc2104)), and
 * HKDF-SHA256 ([RFC 5869](https://www.rfc-editor.org/rfc/rfc5869)).
 *
 * @example Hashing
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * const data = crypto.getRandomValues(new Uint8Array(100));
 * assertEquals(
 *   sha256(data),
 *   new Uint8Array(await crypto.subtle.digest("SHA-256", data)),
 * );
 * assertEquals(
 *   sha512(data),
 *   new Uint8Array(await crypto.subtle.digest("SHA-512", data)),
 * );
 * ```
 *
 * @example Signing
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * const key = crypto.getRandomValues(new Uint8Array(32));
 * const data = crypto.getRandomValues(new Uint8Array(100));
 * assertEquals(
 *   hmac(key, data),
 *   await crypto.subtle.sign(
 *     "HMAC",
 *     await crypto.subtle.importKey(
 *       "raw",
 *       key,
 *       { name: "HMAC", hash: "SHA-256" },
 *       false,
 *       ["sign"],
 *     ),
 *     data,
 *   ).then(($) => new Uint8Array($)),
 * );
 * ```
 *
 * @example Key derivation
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * const key = crypto.getRandomValues(new Uint8Array(32));
 * assertEquals(
 *   hkdf(key),
 *   await crypto.subtle.deriveBits(
 *     {
 *       name: "HKDF",
 *       hash: "SHA-256",
 *       info: new Uint8Array(),
 *       salt: new Uint8Array(),
 *     },
 *     await crypto.subtle.importKey("raw", key, "HKDF", false, ["deriveBits"]),
 *     256,
 *   ).then(($) => new Uint8Array($)),
 * );
 * ```
 *
 * @module hash
 */

import { sha256, sha512 } from "./src/sha2.ts";
import { hmac } from "./src/hmac.ts";
import { hkdf } from "./src/hkdf.ts";

export { hkdf, hmac, sha256, sha512 };
