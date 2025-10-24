/**
 * Elliptic-curve Diffie-Hellman over Curve25519.
 *
 * @example Key exchange
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * // Alice has a secret key
 * const secretKeyA = crypto.getRandomValues(new Uint8Array(32));
 *
 * // Bob has a secret key
 * const secretKeyB = crypto.getRandomValues(new Uint8Array(32));
 *
 * // They share their public keys
 * const publicKeyA = derive(secretKeyA); // A sends to B
 * const publicKeyB = derive(secretKeyB); // B sends to A
 *
 * // And agree on a shared secret
 * const sharedAB = exchange(secretKeyA, publicKeyB);
 * const sharedBA = exchange(secretKeyB, publicKeyA);
 * assertEquals(sharedAB, sharedBA);
 * ```
 *
 * @module x25519
 */

import { deBig, enBig, exp, inv, mod, P, pow, prune } from "./lib.ts";

const F = /* @__PURE__ */ (() => ~(1n << 255n))(); // clears unused top bit
/** Multiplies a private scalar and a public point. */
export const ladder = (scalar: bigint, point: bigint): bigint => {
  // Clamping in bigint form isn't as efficient, but doesn't mutate passed-in
  // key buffers.
  scalar = scalar & ~7n & F | 1n << 254n, point = point & F;
  let a = 1n, b = 0n, c = point, d = 1n, e = 0n, f, g, z = 254n; // t = bits - 1
  do e ^= f = scalar >> z & 1n,
    a ^= g = (a ^ c) & -e,
    c ^= g,
    d ^= g = (b ^ d) & -e,
    a -= b ^= g,
    b += a + b,
    e = f,
    f = a * (c + d) % P,
    g = b * (c - d) % P,
    c = (g + f) ** 2n % P,
    d = (g - f) ** 2n % P * point % P,
    a = a * a % P,
    b = b * b % P,
    f = b - a,
    a = a * b % P,
    b = f * (b + f * 121665n % P) % P; while (z--);
  // Final cswap is outside the loop.
  return mod(pow(exp(b ^= (b ^ d) & -e, b **= 3n), 3, a ^ (a ^ c) & -e) * b);
};
/** Derives an X25519 public key. */
export const derive = (secret_key: Uint8Array): Uint8Array<ArrayBuffer> =>
  deBig(ladder(enBig(secret_key), 9n) & F);
/** Derives a not-all-zero shared secret from two Montgomery-curve keys. */
export const exchange = (
  secret_key: Uint8Array,
  public_key: Uint8Array,
): Uint8Array<ArrayBuffer> | null => {
  const shared = deBig(ladder(enBig(secret_key), enBig(public_key)) & F);
  let byte = 0;
  for (let z = 0; z < 32; ++z) byte |= shared[z];
  return byte ? shared : null;
};
/** Converts an Ed25519 secret key to its X25519 equivalent. */
export const convertSecret = ($: Uint8Array): Uint8Array<ArrayBuffer> =>
  new Uint8Array(prune($).subarray(0, 32));
/** Converts an Ed25519 public key to its X25519 equivalent. */
export const convertPublic = ($: Uint8Array): Uint8Array<ArrayBuffer> => {
  const a = enBig($) & F;
  return deBig(mod((1n + a) * inv(1n - a)) & F);
};
