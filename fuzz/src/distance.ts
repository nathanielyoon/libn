const TEMP = /* @__PURE__ */ new Uint32Array(0x10000);
let swap;
/** Calculates the distance between two strings. */
export const distance = (one: string, two: string): number => {
  if (one.length < two.length) swap = two, two = one, one = swap;
  const min = two.length;
  if (!min) return one.length;
  let max = one.length, out = max;
  let a, b, c, d, e, f, g, h, z = min + 31 >> 5, y, x;
  const hi = Array<number>(z), lo = Array<number>(z);
  do hi[--z] = -1, lo[z] = 0; while (z);
  for (const end = (max + 31 >> 5) - 1; z < end; ++z) {
    a = y = z << 5, b = Math.min(32, max) + a, c = -1, d = x = 0;
    while (y < b) TEMP[one.charCodeAt(y)] |= 1 << y++;
    do e = TEMP[two.charCodeAt(x)],
      f = lo[x >> 5] >>> x & 1,
      g = (c & (e | f)) + c ^ c | e | f,
      h = d | ~(c | g),
      c &= g,
      g = hi[x >> 5] >>> x & 1,
      h >>> 31 ^ g && (hi[x >> 5] ^= 1 << x),
      c >>> 31 ^ f && (lo[x >> 5] ^= 1 << x),
      h = h << 1 | g,
      c = c << 1 | f | ~(d | e | h),
      d = h & (d | e); while (++x < min);
    while (y-- > a) TEMP[one.charCodeAt(y)] = 0;
  }
  a = z <<= 5, b = Math.min(32, max-- - a) + a, c = -1, d = y = 0;
  while (z < b) TEMP[one.charCodeAt(z)] |= 1 << z++;
  do e = TEMP[two.charCodeAt(y)],
    f = lo[y >> 5] >>> y & 1,
    g = (c & (e | f)) + c ^ c | e | f,
    h = d | ~(c | g),
    c &= g,
    g = hi[y >> 5] >>> y & 1,
    h >>> 31 ^ g && (hi[y >> 5] ^= 1 << y),
    c >>> 31 ^ f && (lo[y >> 5] ^= 1 << y),
    out += h >>> max & 1,
    out -= c >>> max & 1,
    h = h << 1 | g,
    c = c << 1 | f | ~(d | e | h),
    d = h & (d | e); while (++y < min);
  while (z-- > a) TEMP[one.charCodeAt(z)] = 0;
  return out;
};
