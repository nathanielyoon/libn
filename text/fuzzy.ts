/** Checks whether one string sorta-includes another. */
export const includes = (source: string, target: string): boolean => {
  const max = source.length, min = target.length;
  if (min > max) return false;
  if (min === max) return source === target;
  top: for (let z = 0, y = 0; z < min; ++z) {
    for (const next = target.charCodeAt(z); y < max; ++y) {
      if (source.charCodeAt(y) === next) continue top;
    }
    return false;
  }
  return true;
};
const TEMP = /* @__PURE__ */ new Uint32Array(0x110000);
const code = /* @__PURE__ */
  (() => String.prototype.codePointAt as (this: string) => number)();
/** Calculates the distance between two strings. */
export const distance = (one: string, two: string): number => {
  let a = [...one], b = [...two];
  if (a.length < b.length) [a, b] = [b, a];
  const min = b.length;
  if (!min) return a.length;
  let max = a.length, to = max, c, d, e, f, g, h, i, j, z = min + 31 >> 5, y, x;
  const hi = Array<number>(z), lo = Array<number>(z);
  do hi[--z] = -1, lo[z] = 0; while (z);
  for (const end = (max + 31 >> 5) - 1; z < end; ++z) {
    c = y = z << 5, d = Math.min(32, max) + c, e = -1, f = x = 0;
    while (y < d) TEMP[code.call(a[y])] |= 1 << y++;
    do g = TEMP[code.call(b[x])],
      h = lo[x >> 5] >>> x & 1,
      i = (e & (g | h)) + e ^ e | g | h,
      j = f | ~(e | i),
      e &= i,
      i = hi[x >> 5] >>> x & 1,
      e >>> 31 ^ h && (lo[x >> 5] ^= 1 << x),
      j >>> 31 ^ i && (hi[x >> 5] ^= 1 << x),
      j = j << 1 | i,
      e = e << 1 | h | ~(f | g | j),
      f = j & (f | g); while (++x < min);
    while (y-- > c) TEMP[code.call(a[y])] = 0;
  }
  c = z <<= 5, d = Math.min(32, max-- - c) + c, e = -1, f = y = 0;
  while (z < d) TEMP[code.call(a[z])] |= 1 << z++;
  do g = TEMP[code.call(b[y])],
    h = lo[y >> 5] >>> y & 1,
    i = (e & (g | h)) + e ^ e | g | h,
    j = f | ~(e | i),
    e &= i,
    i = hi[y >> 5] >>> y & 1,
    e >>> 31 ^ h && (lo[y >> 5] ^= 1 << y),
    j >>> 31 ^ i && (hi[y >> 5] ^= 1 << y),
    to += j >>> max & 1,
    to -= e >>> max & 1,
    j = j << 1 | i,
    e = e << 1 | h | ~(f | g | j),
    f = j & (f | g); while (++y < min);
  while (z-- > c) TEMP[code.call(a[z])] = 0;
  return to;
};
