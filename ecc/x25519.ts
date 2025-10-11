import { deBig, enBig, P, p, prune, r, s, v } from "./lib.ts";

const F = /* @__PURE__ */ (() => ~(1n << 255n))();
const ladder = (scalar: bigint, point: bigint) => {
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
  return p(s(r(b ^= (b ^ d) & -e, b **= 3n), 3, a ^ (a ^ c) & -e) * b) & F;
};
// Clamping in bigint form isn't as efficient, but doesn't mutate the passed-in
// key buffers.
const clamp = ($: Uint8Array) => enBig($) & ~7n & F | 1n << 254n;
/** Derives an X25519 public key. */
export const derive = (secret_key: Uint8Array): Uint8Array<ArrayBuffer> =>
  deBig(ladder(clamp(secret_key), 9n));
/** Derives a not-all-zero shared secret from two Montgomery-curve keys. */
export const exchange = (
  secret_key: Uint8Array,
  public_key: Uint8Array,
): Uint8Array<ArrayBuffer> | null => {
  const shared = deBig(ladder(clamp(secret_key), enBig(public_key) & F));
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
  return deBig(p((1n + a) * v(1n - a)) & F);
};
