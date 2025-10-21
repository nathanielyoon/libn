import { multiply } from "./lib.ts";

/** Hashes to a 32-bit integer with GoodOAAT. */
export const oaat = ($: Uint8Array, seed: number): number => {
  let a = seed ^ 0x3b00, b = seed << 15 | seed >>> 17, z = 0;
  while (z < $.length) {
    b += a = (a + $[z++]) * 9 | 0;
    b = (b << 7 | b >>> 25) * 5 | 0;
  }
  a ^= b, b ^= a += (b << 14 | b >>> 18) >>> 0;
  a ^= b += (a >>> 6 | a << 26) >>> 0, b ^= a += (b << 5 | b >>> 27) >>> 0;
  return b += (a >>> 8 | a << 24) >>> 0, b >>> 0;
};
/** Hashes to a 32-bit integer with a5hash32. */
export const a5hash = ($: Uint8Array, seed: number): number => {
  const end = $.length;
  let v01 = 0x55555555, v10 = 0xaaaaaaaa;
  let { lo: s1, hi: s2 } = multiply(
    0x85a308d3 ^ end ^ seed & v10,
    0x243f6a88 ^ end ^ seed & v01,
  );
  let s3 = 0xfb0bd3ea, s4 = 0x0f58fd47, a, b = 0, z;
  if (end > 16) {
    const max = end - 16;
    v01 ^= s1, v10 ^= s2, z = 0;
    do a = s1,
      b = s4,
      { lo: s1, hi: s2 } = multiply(
        ($[z++] | $[z++] << 8 | $[z++] << 16 | $[z++] << 24) + s1,
        ($[z++] | $[z++] << 8 | $[z++] << 16 | $[z++] << 24) + s2,
      ),
      { lo: s3, hi: s4 } = multiply(
        ($[z++] | $[z++] << 8 | $[z++] << 16 | $[z++] << 24) + s3,
        ($[z++] | $[z++] << 8 | $[z++] << 16 | $[z++] << 24) + s4,
      ),
      s1 += v01,
      s2 += b,
      s3 += a,
      s4 += v10; while (z < max);
    a = $[max + 8] | $[max + 9] << 8 | $[max + 10] << 16 | $[max + 11] << 24;
    b = $[max + 12] | $[max + 13] << 8 | $[max + 14] << 16 | $[max + 15] << 24;
    end > 8 + z && ({ lo: s3, hi: s4 } = multiply(
      ($[max] | $[max + 1] << 8 | $[max + 2] << 16 | $[max + 3] << 24) + s3,
      ($[max + 4] | $[max + 5] << 8 | $[max + 6] << 16 | $[max + 7] << 24) + s4,
    ));
  } else if (a = $[0] | $[1] << 8 | $[2] << 16 | $[3] << 24, end > 3) {
    b = $[end - 4] | $[end - 3] << 8 | $[end - 2] << 16 | $[end - 1] << 24;
    end > 8 && ({ lo: s3, hi: s4 } = multiply(
      ($[z = end >>> 1 & ~3] | $[++z] << 8 | $[++z] << 16 | $[++z] << 24) + s3,
      ($[z = end - z - 1] | $[++z] << 8 | $[++z] << 16 | $[++z] << 24) + s4,
    ));
  }
  ({ lo: s1, hi: s2 } = multiply(a + (s1 ^ s3), b + (s2 ^ s4)));
  return ({ lo: a, hi: b } = multiply(v01 ^ s1, s2)), (a ^ b) >>> 0;
};
