const TEMP = new Uint32Array(0x10000);
/** Calculates Levenshtein distance. */
export const myers = (one: string, two: string): number => {
  if (two.length < one.length) [two, one] = [one, two];
  const a = one.length, b = two.length;
  if (!a) return b;
  const c = a + 31 >> 5, d = new Int32Array(c), e = new Int32Array(c).fill(-1);
  let z = 0, y, x, f, g, h, i, j, k, l, m, n, o;
  for (f = b - 1 >> 5; z < f; TEMP.fill(0), ++z) {
    y = z << 5, g = Math.min(32, b) + y, h = -1, i = x = 0;
    do TEMP[two.charCodeAt(y)] |= 1 << y; while (++y < g);
    do j = TEMP[one.charCodeAt(x)],
      k = d[x >> 5] >> x & 1,
      l = ((j | k) & h) + h ^ h | j | k,
      m = h & l,
      m >>> 31 ^ k && (d[x >> 5] ^= 1 << x),
      n = i | ~(l | h),
      o = e[x >> 5] >> x & 1,
      n >>> 31 ^ o && (e[x >> 5] ^= 1 << x),
      n = n << 1 | o,
      h = m << 1 | k | ~(j | i | n),
      i = n & (j | i); while (++x < a);
  }
  z <<= 5, f = b, g = Math.min(32, b - z) + z, h = -1, i = y = 0;
  do TEMP[two.charCodeAt(z)] |= 1 << z; while (++z < g);
  do j = TEMP[one.charCodeAt(y)],
    k = (d[y >> 5] >> y) & 1,
    l = ((j | k) & h) + h ^ h | j | k,
    m = h & l,
    f -= m >>> b - 1 & 1,
    m >>> 31 ^ k && (d[y >> 5] ^= 1 << y),
    n = i | ~(l | h),
    f += n >>> b - 1 & 1,
    o = e[y >> 5] >> y & 1,
    n >>> 31 ^ o && (e[y >> 5] ^= 1 << y),
    n = n << 1 | o,
    h = m << 1 | k | ~(j | i | n),
    i = n & (j | i); while (++y < a);
  return TEMP.fill(0), f;
};
/** Matching string, with its cosine similarity and Levenshtein distance. */
export type Match = { value: string; ratio: number; distance: number };
/** Fuzzy string matcher. */
export class Fuzzer<A extends number> {
  private set = new Set<string>();
  private list: { value: string; magnitude: number }[] = [];
  private map = new Map<string, number[]>();
  /** Creates a matcher with the specified token length. */
  constructor(private size: A) {}
  private split($: string): Map<string, number> {
    const a = new Map<string, number>();
    for (let b = `\0${$}\0`, c, z = this.size; z <= b.length; ++z) {
      a.set(c = b.slice(z - 3, z), (a.get(c) ?? 0) + 1 & 0xff);
    }
    return a;
  }
  /** Adds a string to the set. */
  add(value: string): this {
    if (this.set.size === this.set.add(value).size) return this;
    const a = this.list.length << 8;
    let b = 0, c;
    for (const pair of this.split(value)) {
      if (b += pair[1] ** 2, c = this.map.get(pair[0])) c.push(pair[1] | a);
      else this.map.set(pair[0], [pair[1] | a]);
    }
    return this.list.push({ value: value, magnitude: b ** 0.5 }), this;
  }
  /** Queries the set. */
  get(query: string, max?: number): Match[] {
    const a = new Map<number, number>();
    let b = 0, c, d;
    for (const pair of this.split(query)) {
      if (c = pair[1], b += c ** 2, d = this.map.get(pair[0])) {
        let e, z = d.length;
        do a.set(e = d[--z], (a.get(e) ?? 0) + c * (d[z] & 0xff)); while (z);
      }
    }
    b **= 0.5;
    const e = Array.from(a, (pair) => {
      const f = this.list[pair[0] >>> 8];
      return { value: f.value, ratio: pair[1] / b / f.magnitude, distance: -1 };
    }).sort((one, two) => two.ratio - one.ratio).slice(0, max ?? 64);
    for (let z = 0; z < e.length; ++z) e[z].distance = myers(query, e[z].value);
    return e.sort((one, two) => one.distance - two.distance);
  }
}
