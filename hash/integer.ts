import { multiply } from "./lib.ts";

/** Hashes to a 32-bit integer with GoodOAAT. */
export const oaat = ($: Uint8Array, seed: number): number => {
  let h1 = seed ^ 0x3b00, h2 = seed << 15 | seed >>> 17, z = 0;
  while (z < $.length) {
    h2 += h1 = (h1 + $[z++]) * 9 | 0, h2 = (h2 << 7 | h2 >>> 25) * 5 | 0;
  }
  h2 ^= h1 = (h1 ^ h2) + (h2 << 14 | h2 >>> 18) >>> 0;
  h1 ^= h2 += (h1 >>> 6 | h1 << 26) >>> 0;
  h2 ^= h1 += (h2 << 5 | h2 >>> 27) >>> 0;
  return h2 += (h1 >>> 8 | h1 << 24) >>> 0, h2 >>> 0;
};
/** Hashes to a 32-bit integer with a5hash32. */
export const a5hash = ($: Uint8Array, seed: number): number => {
  let v01 = 0x55555555, v10 = 0xaaaaaaaa, z, y = $.length;
  let { lo: s1, hi: s2 } = multiply(
    0x85a308d3 ^ y ^ seed & v10,
    0x243f6a88 ^ y ^ seed & v01,
  );
  let s3 = 0xfb0bd3ea, s4 = 0x0f58fd47, a, b = 0;
  if (y > 16) {
    y -= 16, v01 ^= s1, v10 ^= s2, z = 0;
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
      s4 += v10; while (z < y);
    a = $[y + 8] | $[y + 9] << 8 | $[y + 10] << 16 | $[y + 11] << 24;
    b = $[y + 12] | $[y + 13] << 8 | $[y + 14] << 16 | $[y + 15] << 24;
    y + 8 > z && ({ lo: s3, hi: s4 } = multiply(
      ($[y] | $[y + 1] << 8 | $[y + 2] << 16 | $[y + 3] << 24) + s3,
      ($[y + 4] | $[y + 5] << 8 | $[y + 6] << 16 | $[y + 7] << 24) + s4,
    ));
  } else if (a = $[0] | $[1] << 8 | $[2] << 16 | $[3] << 24, y > 3) {
    b = $[y - 4] | $[y - 3] << 8 | $[y - 2] << 16 | $[y - 1] << 24;
    y > 8 && ({ lo: s3, hi: s4 } = multiply(
      ($[z = y >>> 1 & ~3] | $[++z] << 8 | $[++z] << 16 | $[++z] << 24) + s3,
      ($[z = y - z - 1] | $[++z] << 8 | $[++z] << 16 | $[++z] << 24) + s4,
    ));
  }
  ({ lo: s1, hi: s2 } = multiply(a + (s1 ^ s3), b + (s2 ^ s4)));
  return ({ lo: s1, hi: s2 } = multiply(v01 ^ s1, s2)), (s1 ^ s2) >>> 0;
};
