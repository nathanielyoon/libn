const TEMP = new Uint32Array(0x10000);
/** Calculates Levenshtein distance. */
export const myers = (one: string, two: string): number => {
  if (one.length > two.length) [two, one] = [one, two];
  const a = one.length;
  let b = two.length, c = a + 31 >> 5, d, e, f, g, h, i, j, k, z = 0, y;
  if (!a) return b;
  const l = new Int32Array(c), m = new Int32Array(c).fill(-1), n = b - 1 >> 5;
  do {
    y = z << 5, d = b - y - 32, d = 32 + (d & d >> 31) + y;
    do TEMP[two.charCodeAt(y)] |= 1 << y; while (++y < d);
    z === n && (c = b--), d = -1, e = y = 0;
    do f = TEMP[one.charCodeAt(y)],
      g = l[y >> 5] >> y & 1,
      h = (d & (f | g)) + d ^ d | f | g,
      i = d & h,
      g ^ i >>> 31 && (l[y >> 5] ^= 1 << y),
      j = e | ~(d | h),
      k = m[y >> 5] >> y & 1,
      j >>> 31 ^ k && (m[y >> 5] ^= 1 << y),
      z === n && (c += (j >>> b & 1) - (i >>> b & 1)),
      j = j << 1 | k,
      d = i << 1 | g | ~(e | f | j),
      e = j & (f | e); while (++y < a);
  } while (TEMP.fill(0), z++ < n);
  return c;
};
