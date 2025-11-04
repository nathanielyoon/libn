/** @module integer */
import { type I64, umul } from "./lib.ts";

/** Hashes to a 32-bit integer with GoodOAAT. */
export const oaat32 = ($: Uint8Array, seed = 0): number => {
  let h1 = seed ^ 0x3b00, h2 = seed << 15 | seed >>> 17, z = 0;
  while (z < $.length) {
    h2 += h1 = (h1 + $[z++]) * 9 | 0, h2 = (h2 << 7 | h2 >>> 25) * 5 | 0;
  }
  h2 ^= h1 = (h1 ^ h2) + (h2 << 14 | h2 >>> 18);
  h1 ^= h2 += h1 >>> 6 | h1 << 26, h2 ^= h1 += h2 << 5 | h2 >>> 27;
  return h2 += h1 >>> 8 | h1 << 24, h2 >>> 0;
};
/** Hashes to a 32-bit integer with a5hash32, always little-endian. */
export const a5hash32 = ($: Uint8Array, seed = 0): number => {
  let v01 = 0x55555555, v10 = 0xaaaaaaaa, z, y = $.length;
  let { lo: s1, hi: s2 } = umul(
    0x85a308d3 ^ y ^ seed & v10,
    0x243f6a88 ^ y ^ seed & v01,
  );
  let s3 = 0xfb0bd3ea, s4 = 0x0f58fd47, a, b = 0;
  if (y > 16) {
    v01 ^= s1, v10 ^= s2, z = 0, y -= 16;
    do a = s1,
      b = s4,
      { lo: s1, hi: s2 } = umul(
        ($[z++] | $[z++] << 8 | $[z++] << 16 | $[z++] << 24) + s1,
        ($[z++] | $[z++] << 8 | $[z++] << 16 | $[z++] << 24) + s2,
      ),
      { lo: s3, hi: s4 } = umul(
        ($[z++] | $[z++] << 8 | $[z++] << 16 | $[z++] << 24) + s3,
        ($[z++] | $[z++] << 8 | $[z++] << 16 | $[z++] << 24) + s4,
      ),
      s1 += v01,
      s2 += b,
      s3 += a,
      s4 += v10; while (z < y);
    a = $[y + 8] | $[y + 9] << 8 | $[y + 10] << 16 | $[y + 11] << 24;
    b = $[y + 12] | $[y + 13] << 8 | $[y + 14] << 16 | $[y + 15] << 24;
    y + 8 > z && ({ lo: s3, hi: s4 } = umul(
      ($[y] | $[y + 1] << 8 | $[y + 2] << 16 | $[y + 3] << 24) + s3,
      ($[y + 4] | $[y + 5] << 8 | $[y + 6] << 16 | $[y + 7] << 24) + s4,
    ));
  } else if (a = $[0] | $[1] << 8 | $[2] << 16 | $[3] << 24, y > 3) {
    b = $[y - 4] | $[y - 3] << 8 | $[y - 2] << 16 | $[y - 1] << 24;
    y > 8 && ({ lo: s3, hi: s4 } = umul(
      ($[z = y >>> 1 & ~3] | $[++z] << 8 | $[++z] << 16 | $[++z] << 24) + s3,
      ($[z = y - z - 1] | $[++z] << 8 | $[++z] << 16 | $[++z] << 24) + s4,
    ));
  }
  ({ lo: s1, hi: s2 } = umul(a + (s1 ^ s3), b + (s2 ^ s4)));
  return ({ lo: s1, hi: s2 } = umul(v01 ^ s1, s2)), (s1 ^ s2) >>> 0;
};
const mul = (one: I64, two: I64) => {
  const a = umul(one.lo, two.lo), b = umul(one.hi, two.lo);
  const c = umul(one.lo, two.hi), d = umul(one.hi, two.hi);
  one.lo = a.lo, one.hi = c.lo + b.lo >>> 0, one.hi < b.lo && ++c.hi;
  one.hi = one.hi + a.hi >>> 0, one.hi < a.hi && ++c.hi, two.hi = d.hi;
  two.lo = d.lo + b.hi >>> 0, two.lo < b.hi && ++two.hi;
  two.lo = two.lo + c.hi >>> 0, two.lo < c.hi && ++two.hi;
};
/** Hashes to a 64-bit integer with a5hash64, always little-endian. */
export const a5hash64 = ($: Uint8Array, seed = 0n): bigint => {
  let h01 = 0x55555555, l01 = h01, h10 = 0xaaaaaaaa, l10 = h10, z, y = $.length;
  const a = { hi: 0, lo: 0 }, b = { hi: 0, lo: 0 }, c = y / 0x100000000 >>> 0;
  const d = y >>> 0, e = Number(seed >> 32n), f = Number(seed & 0xffffffffn);
  // Since the 128-bit multiply directly mutates the integers, initialization is
  // swapped from the source, which reverses the order of arguments in the first
  // call and not any of the others.
  const s1 = { hi: 0x452821e6 ^ c ^ e & h10, lo: 0x38d01377 ^ d ^ f & h10 };
  const s2 = { hi: 0x243f6a88 ^ c ^ e & h01, lo: 0x85a308d3 ^ d ^ f & h01 };
  mul(s1, s2), l10 = (l10 ^ s2.lo) >>> 0, h10 = (h10 ^ s2.hi) >>> 0;
  if (y > 16) {
    l01 = (l01 ^ s1.lo) >>> 0, h01 = (h01 ^ s1.hi) >>> 0, z = 0, y -= 16;
    do s1.lo ^= $[z++] | $[z++] << 8 | $[z++] << 16 | $[z++] << 24,
      s1.hi ^= $[z++] | $[z++] << 8 | $[z++] << 16 | $[z++] << 24,
      s2.lo ^= $[z++] | $[z++] << 8 | $[z++] << 16 | $[z++] << 24,
      s2.hi ^= $[z++] | $[z++] << 8 | $[z++] << 16 | $[z++] << 24,
      mul(s1, s2),
      s1.lo = (s1.lo >>> 0) + l01 >>> 0,
      s1.hi += h01,
      s1.lo < l01 && ++s1.hi,
      s2.lo = (s2.lo >>> 0) + l10 >>> 0,
      s2.hi += h10,
      s2.lo < l10 && ++s2.hi; while (z < y);
    a.lo = $[y] | $[y + 1] << 8 | $[y + 2] << 16 | $[y + 3] << 24;
    a.hi = $[y + 4] | $[y + 5] << 8 | $[y + 6] << 16 | $[y + 7] << 24;
    b.lo = $[y + 8] | $[y + 9] << 8 | $[y + 10] << 16 | $[y + 11] << 24;
    b.hi = $[y + 12] | $[y + 13] << 8 | $[y + 14] << 16 | $[y + 15] << 24;
  } else if (y > 3) {
    a.hi = $[0] | $[1] << 8 | $[2] << 16 | $[3] << 24;
    a.lo = $[y - 4] | $[y - 3] << 8 | $[y - 2] << 16 | $[y - 1] << 24;
    b.hi = $[z = y / 8 << 2] | $[++z] << 8 | $[++z] << 16 | $[++z] << 24;
    b.lo = $[z = y - z - 1] | $[++z] << 8 | $[++z] << 16 | $[++z] << 24;
  } else a.lo = $[0] | $[1] << 8 | $[2] << 16 | $[3] << 24;
  s1.lo ^= a.lo, s1.hi ^= a.hi, s2.lo ^= b.lo, s2.hi ^= b.hi, mul(s1, s2);
  s1.lo ^= l01, s1.hi ^= h01, mul(s1, s2);
  return BigInt((s1.lo ^ s2.lo) >>> 0) | BigInt((s1.hi ^ s2.hi) >>> 0) << 32n;
};
