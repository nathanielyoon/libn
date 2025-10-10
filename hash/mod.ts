/**
 * Cryptographic hash functions.
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
 *   blake2s(data),
 *   new Uint8Array(await crypto.subtle.digest("BLAKE2S", data)),
 * );
 * assertEquals(
 *   blake2b(data),
 *   new Uint8Array(await crypto.subtle.digest("BLAKE2B", data)),
 * );
 * assertEquals(
 *   blake3(data),
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

import { sha224, sha256, sha384, sha512 } from "./sha2.ts";
import { hkdf, hmac } from "./hmac.ts";
import { blake2b, blake2s } from "./blake2.ts";
import { blake3 } from "./blake3.ts";

export { blake2b, blake2s, blake3, hkdf, hmac, sha224, sha256, sha384, sha512 };
