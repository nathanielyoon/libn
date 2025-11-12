import { umul32, umul64 } from "./lib.ts";

/** Hashes to a 32-bit integer with a5hash32, always little-endian. */
export const a5hash32 = ($: Uint8Array, seed = 0): number => {
  let v01 = 0x55555555, v10 = 0xaaaaaaaa, z, y = $.length;
  let { lo: s1, hi: s2 } = umul32(
    0x85a308d3 ^ y ^ seed & v10,
    0x243f6a88 ^ y ^ seed & v01,
  );
  let s3 = 0xfb0bd3ea, s4 = 0x0f58fd47, a, b = 0;
  if (y > 16) {
    v01 ^= s1, v10 ^= s2, z = 0, y -= 16;
    do a = s1,
      b = s4,
      { lo: s1, hi: s2 } = umul32(
        ($[z++] | $[z++] << 8 | $[z++] << 16 | $[z++] << 24) + s1,
        ($[z++] | $[z++] << 8 | $[z++] << 16 | $[z++] << 24) + s2,
      ),
      { lo: s3, hi: s4 } = umul32(
        ($[z++] | $[z++] << 8 | $[z++] << 16 | $[z++] << 24) + s3,
        ($[z++] | $[z++] << 8 | $[z++] << 16 | $[z++] << 24) + s4,
      ),
      s1 += v01,
      s2 += b,
      s3 += a,
      s4 += v10; while (z < y);
    a = $[y + 8] | $[y + 9] << 8 | $[y + 10] << 16 | $[y + 11] << 24;
    b = $[y + 12] | $[y + 13] << 8 | $[y + 14] << 16 | $[y + 15] << 24;
    y + 8 > z && ({ lo: s3, hi: s4 } = umul32(
      ($[y] | $[y + 1] << 8 | $[y + 2] << 16 | $[y + 3] << 24) + s3,
      ($[y + 4] | $[y + 5] << 8 | $[y + 6] << 16 | $[y + 7] << 24) + s4,
    ));
  } else if (a = $[0] | $[1] << 8 | $[2] << 16 | $[3] << 24, y > 3) {
    b = $[y - 4] | $[y - 3] << 8 | $[y - 2] << 16 | $[y - 1] << 24;
    y > 8 && ({ lo: s3, hi: s4 } = umul32(
      ($[z = y >>> 1 & ~3] | $[++z] << 8 | $[++z] << 16 | $[++z] << 24) + s3,
      ($[z = y - z - 1] | $[++z] << 8 | $[++z] << 16 | $[++z] << 24) + s4,
    ));
  }
  ({ lo: s1, hi: s2 } = umul32(a + (s1 ^ s3), b + (s2 ^ s4)));
  return ({ lo: s1, hi: s2 } = umul32(v01 ^ s1, s2)), (s1 ^ s2) >>> 0;
};
/** Hashes to a 64-bit integer with a5hash64, always little-endian. */
export const a5hash64 = ($: Uint8Array, seed = 0n): bigint => {
  let h01 = 0x55555555, l01 = h01, h10 = 0xaaaaaaaa, l10 = h10;
  const a = Number(seed >> 32n), b = Number(seed & 0xffffffffn);
  let c = $.length, d = c / 0x100000000 >>> 0, e = c >>> 0, z = 0;
  const s1 = { hi: 0x452821e6 ^ d ^ a & h10, lo: 0x38d01377 ^ e ^ b & h10 };
  const s2 = { hi: 0x243f6a88 ^ d ^ a & h01, lo: 0x85a308d3 ^ e ^ b & h01 };
  umul64(s1, s2);
  if (c > 16) {
    l01 = (l01 ^ s1.lo) >>> 0, h01 = (h01 ^ s1.hi) >>> 0;
    l10 = (l10 ^ s2.lo) >>> 0, h10 = (h10 ^ s2.hi) >>> 0;
    do s1.hi ^= $[z++] | $[z++] << 8 | $[z++] << 16 | $[z++] << 24,
      s1.lo ^= $[z++] | $[z++] << 8 | $[z++] << 16 | $[z++] << 24,
      s2.hi ^= $[z++] | $[z++] << 8 | $[z++] << 16 | $[z++] << 24,
      s2.lo ^= $[z++] | $[z++] << 8 | $[z++] << 16 | $[z++] << 24,
      umul64(s1, s2),
      s1.lo = s1.lo + l01 >>> 0,
      s1.hi += h01 + (s1.lo < l01 as unknown as number),
      s2.lo = s2.lo + l10 >>> 0,
      s2.hi += h10 + (s2.lo < l10 as unknown as number); while ((c -= 16) > 16);
  }
  if (c > 3) {
    d = c >>> 3 << 2, c += z - 4, e = c - d, d += z;
    s1.hi ^= $[z] | $[z + 1] << 8 | $[z + 2] << 16 | $[z + 3] << 24;
    s1.lo ^= $[c] | $[c + 1] << 8 | $[c + 2] << 16 | $[c + 3] << 24;
    s2.hi ^= $[d] | $[d + 1] << 8 | $[d + 2] << 16 | $[d + 3] << 24;
    s2.lo ^= $[e] | $[e + 1] << 8 | $[e + 2] << 16 | $[e + 3] << 24;
  } else if (c) s1.lo ^= $[z] | $[z + 1] << 8 | $[z + 2] << 16;
  umul64(s1, s2), s1.lo ^= l01, s1.hi ^= h01, umul64(s1, s2);
  return BigInt((s1.hi ^ s2.hi) >>> 0) << 32n | BigInt((s1.lo ^ s2.lo) >>> 0);
};
