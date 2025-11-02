/** Checks whether one string sorta-includes another. */
export const includes = (source: string, target: string): boolean => {
  const a = [...source], b = [...target], max = a.length, min = b.length;
  if (min > max) return false;
  if (min === max) return source === target;
  top: for (let z = 0, y = 0; z < min; ++z) {
    for (const next = b[z].charCodeAt(0); y < max; ++y) {
      if (a[y].charCodeAt(0) === next) continue top;
    }
    return false;
  }
  return true;
};
const TEMP = /* @__PURE__ */ new Uint32Array(0x10000);
const myers32 = (one: string, two: string) => {
  let hi = -1, lo = 0, score = one.length, a, b, z = 0, y = 0;
  do TEMP[one.charCodeAt(y)] |= 1 << y; while (++y < score);
  const end = 1 << one.length - 1;
  do a = TEMP[two.charCodeAt(z)],
    b = a | lo,
    a |= (a & hi) + hi ^ hi,
    lo |= ~(a | hi),
    hi &= a,
    lo & end && score++,
    hi & end && score--,
    lo = lo << 1 | 1,
    hi = hi << 1 | ~(b | lo),
    lo &= b; while (++z < two.length);
  do TEMP[one.charCodeAt(--y)] = 0; while (y);
  return score;
};
const myers = (one: string, two: string) => {
  let max = one.length, score = max, z = two.length + 31 >> 5, y, x;
  const hi = Array<number>(z), lo = Array<number>(z), end = (max + 31 >> 5) - 1;
  do hi[--z] = -1, lo[z] = 0; while (z);
  let a, b, c, d, e, f, g, h;
  do {
    a = y = z << 5, b = Math.min(32, max) + a, c = -1, d = x = 0;
    while (y < b) TEMP[one.charCodeAt(y)] |= 1 << y++;
    do e = TEMP[two.charCodeAt(x)],
      f = lo[x >> 5] >>> x & 1,
      g = (c & (e | f)) + c ^ c | e | f,
      h = d | ~(c | g),
      c &= g,
      g = hi[x >> 5] >>> x & 1,
      c >>> 31 ^ f && (lo[x >> 5] ^= 1 << x),
      h >>> 31 ^ g && (hi[x >> 5] ^= 1 << x),
      h = h << 1 | g,
      c = c << 1 | f | ~(d | e | h),
      d = h & (d | e); while (++x < two.length);
    while (y-- > a) TEMP[one.charCodeAt(y)] = 0;
  } while (++z < end);
  a = z <<= 5, b = Math.min(32, max-- - a) + a, c = -1, d = y = 0;
  while (z < b) TEMP[one.charCodeAt(z)] |= 1 << z++;
  do e = TEMP[two.charCodeAt(y)],
    f = lo[y >> 5] >>> y & 1,
    g = (c & (e | f)) + c ^ c | e | f,
    h = d | ~(c | g),
    c &= g,
    g = hi[y >> 5] >>> y & 1,
    c >>> 31 ^ f && (lo[y >> 5] ^= 1 << y),
    h >>> 31 ^ g && (hi[y >> 5] ^= 1 << y),
    score += h >>> max & 1,
    score -= c >>> max & 1,
    h = h << 1 | g,
    c = c << 1 | f | ~(d | e | h),
    d = h & (d | e); while (++y < two.length);
  while (z-- > a) TEMP[one.charCodeAt(z)] = 0;
  return score;
};
/** Calculates the Levenshtein distance between two strings. */
export const distance = (one: string, two: string): number => {
  if (one.length < two.length) [one, two] = [two, one];
  return two.length
    ? one.length > 32 ? myers(one, two) : myers32(one, two)
    : one.length;
};
