/**
 * Key exchange and digital signatures.
 *
 * @example X25519 key exchange (RFC 7748)
 * ```ts
 * import { derive, exchange } from "@libn/ecc/x25519";
 * import { assertEquals } from "@std/assert";
 *
 * const key1 = crypto.getRandomValues(new Uint8Array(32));
 * const key2 = crypto.getRandomValues(new Uint8Array(32));
 * assertEquals(exchange(key1, derive(key2)), exchange(key2, derive(key1)));
 * assertEquals(exchange(key1, new Uint8Array(32)), null);
 * ```
 *
 * @example Ed25519 signatures (RFC 8032)
 * ```ts Key generation, signing, verification
 * import { generate, sign, verify } from "@libn/ecc/ed25519";
 * import { assert } from "@std/assert";
 *
 * const secretKey = crypto.getRandomValues(new Uint8Array(32));
 * const publicKey = generate(secretKey);
 * const data = crypto.getRandomValues(new Uint8Array(32));
 * const signature = sign(secretKey, data);
 * assert(verify(publicKey, data, signature));
 * ```
 *
 * @module ecc
 */

export { convertPublic, convertSecret, derive, exchange } from "./x25519.ts";
export { generate, sign, verify } from "./ed25519.ts";
