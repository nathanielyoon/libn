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
  if (one.length > two.length) {
    const temp = one;
    one = two, two = temp;
  }
  const min = one.length;
  let a = two.length;
  if (!min) return a;
  let is_final_iteration = false, b = min + 31 >> 5, c, d, e, f, g, h, z = 0, y;
  const i = new Int32Array(b), j = new Int32Array(b).fill(-1), max = a - 1 >> 5;
  do {
    y = z << 5, c = a - y - 32, c = 32 + (c & c >> 31) + y;
    do TEMP[two.charCodeAt(y)] |= 1 << y; while (++y < c);
    // For the final iteration, `b` becomes the output score, set initially to
    // the maximum distance. `a` (post-)decrements because it's only used for
    // shifts (which need 1 less).
    z === max && (b = a--, is_final_iteration = true), c = -1, d = y = 0;
    do e = TEMP[one.charCodeAt(y)],
      f = i[y >> 5] >> y & 1,
      g = (c & (e | f)) + c ^ c | e | f,
      h = c & g,
      f ^ h >>> 31 && (i[y >> 5] ^= 1 << y),
      g = d | ~(c | g),
      c = j[y >> 5] >> y & 1,
      g >>> 31 ^ c && (j[y >> 5] ^= 1 << y),
      is_final_iteration && (b += (g >> a & 1) - (h >> a & 1)),
      g = g << 1 | c,
      c = h << 1 | f | ~(d | e | g),
      d = g & (e | d); while (++y < min);
  } while (TEMP.fill(0), z++ < max); // clear buffer after each use
  return b;
};
