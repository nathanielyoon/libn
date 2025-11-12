/** @module x25519 */
import { deBig, enBig, exp, mod, P, pow } from "./lib.ts";

const F = /* @__PURE__ */ (() => ~(1n << 255n))(); // mask clears unused top bit
/** Multiplies a private scalar and a public point. */
export const ladder = (scalar: bigint, point: bigint): bigint => {
  // Clamping in bigint form doesn't mutate passed-in key buffers.
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
export const derive = (secretKey: Uint8Array): Uint8Array<ArrayBuffer> =>
  deBig(ladder(enBig(secretKey), 9n) & F);
/** Derives a not-all-zero shared secret from two Montgomery-curve keys. */
export const exchange = (
  secretKey: Uint8Array,
  publicKey: Uint8Array,
): Uint8Array<ArrayBuffer> | null => {
  const shared = deBig(ladder(enBig(secretKey), enBig(publicKey)) & F);
  let byte = 0;
  for (let z = 0; z < 32; ++z) byte |= shared[z];
  return byte ? shared : null;
};
