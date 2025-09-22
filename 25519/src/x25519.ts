import { de_big, en_big, prune } from "./bigint.ts";
import { P, p, r, s, v } from "./curve.ts";

const F = /* @__PURE__ */ BigInt(
  "0x7fffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff",
);
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
/** Multiplies a public coordinate (if omitted, the generator) by a scalar. */
export const x25519 = (
  secret_key: Uint8Array,
  public_key?: Uint8Array,
): Uint8Array<ArrayBuffer> =>
  de_big(ladder( // clamping in bigint form won't mutate passed-in buffers
    en_big(secret_key) & ~7n & F | 1n << 254n,
    public_key ? en_big(public_key) & F : 9n,
  ));
/** Converts an Edwards-curve secret key to its Montgomery-curve equivalent. */
export const convert_secret = ($: Uint8Array): Uint8Array<ArrayBuffer> =>
  new Uint8Array(prune($).subarray(0, 32));
/** Converts an Edwards-curve public key to its Montgomery-curve equivalent. */
export const convert_public = ($: Uint8Array): Uint8Array<ArrayBuffer> => {
  const a = en_big($) & F;
  return de_big(p((1n + a) * v(1n - a)) & F);
};
