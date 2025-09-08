/**
 * [Levenshtein distance](https://en.wikipedia.org/wiki/Levenshtein_distance).
 *
 * @example Fuzzy-sort strings
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(
 *   ["arsenal", "spurs"].sort((one, two) =>
 *     myers("winners", one) - myers("winners", two)
 *   ),
 *   ["spurs", "arsenal"],
 * );
 * ```
 *
 * @module fuzz
 */

const TEMP = new Uint32Array(0x10000);
/** Calculates the distance between two strings. */
export const myers = (one: string, two: string): number => {
  if (one.length > two.length) [two, one] = [one, two];
  const a = one.length;
  let b = two.length, c = a + 31 >> 5, d, e, f, g, h, i, z = 0, y;
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
      h = e | ~(d | h),
      d = m[y >> 5] >> y & 1,
      h >>> 31 ^ d && (m[y >> 5] ^= 1 << y),
      z === n && (c += (h >> b & 1) - (i >> b & 1)),
      h = h << 1 | d,
      d = i << 1 | g | ~(e | f | h),
      e = h & (f | e); while (++y < a);
  } while (TEMP.fill(0), z++ < n);
  return c;
};
