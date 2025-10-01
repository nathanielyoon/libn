/**
 * SHA-2 ([RFC 6234](https://www.rfc-editor.org/rfc/rfc6234)),
 * BLAKE2 ([RFC 7693](https://www.rfc-editor.org/rfc/rfc7693)) and BLAKE3
 * ([specification](https://github.com/BLAKE3-team/BLAKE3-specs/)),
 * HMAC-SHA256 ([RFC 2104](https://www.rfc-editor.org/rfc/rfc2104)), and
 * HKDF-SHA256 ([RFC 5869](https://www.rfc-editor.org/rfc/rfc5869)).
 *
 * @example SHA-2 hashing
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { crypto } from "@std/crypto";
 *
 * const data = crypto.getRandomValues(new Uint8Array(100));
 * assertEquals(
 *   sha224(data),
 *   new Uint8Array(await crypto.subtle.digest("SHA-224", data)),
 * );
 * assertEquals(
 *   sha256(data),
 *   new Uint8Array(await crypto.subtle.digest("SHA-256", data)),
 * );
 * assertEquals(
 *   sha384(data),
 *   new Uint8Array(await crypto.subtle.digest("SHA-384", data)),
 * );
 * assertEquals(
 *   sha512(data),
 *   new Uint8Array(await crypto.subtle.digest("SHA-512", data)),
 * );
 * ```
 *
 * @example BLAKE hashing
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { crypto } from "@std/crypto";
 *
 * const data = crypto.getRandomValues(new Uint8Array(100));
 * assertEquals(
 *   b2s(data),
 *   new Uint8Array(await crypto.subtle.digest("BLAKE2S", data)),
 * );
 * assertEquals(
 *   b2b(data),
 *   new Uint8Array(await crypto.subtle.digest("BLAKE2B", data)),
 * );
 * assertEquals(
 *   b3(data),
 *   new Uint8Array(await crypto.subtle.digest("BLAKE3", data)),
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
 *   hmac_sha256(key, data),
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
 *   hkdf_sha256(key),
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

import { sha224, sha256, sha384, sha512 } from "./src/sha2.ts";
import { hkdf_sha256, hmac_sha256 } from "./src/hmac.ts";
import { b2b, b2s } from "./src/blake2.ts";
import { b3, b3_derive, b3_keyed } from "./src/blake3.ts";

export {
  b2b,
  b2s,
  b3,
  b3_derive,
  b3_keyed,
  hkdf_sha256,
  hmac_sha256,
  sha224,
  sha256,
  sha384,
  sha512,
};
