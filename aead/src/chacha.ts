const enum Words {
  EXPA = 0x61707865,
  ND_3 = 0x3320646e,
  "2_BY" = 0x79622d32,
  TE_K = 0x6b206574,
}
/** Updates a ChaCha20 block. */
export const chacha = (
  key: DataView,
  count: number,
  iv0: number,
  iv1: number,
  iv2: number,
  to: Uint32Array,
): void => {
  const a = key.getUint32(0, true), b = key.getUint32(4, true);
  const c = key.getUint32(8, true), d = key.getUint32(12, true);
  const e = key.getUint32(16, true), f = key.getUint32(20, true);
  const g = key.getUint32(24, true), h = key.getUint32(28, true);
  let i = Words.EXPA, j = Words.ND_3, k = Words["2_BY"], l = Words.TE_K, m = a;
  let n = b, o = c, p = d, q = e, r = f, s = g, t = h, u = count, v = iv0;
  let w = iv1, x = iv2, z = 10;
  do u ^= i = i + m | 0,
    u = u << 16 | u >>> 16,
    m ^= q = q + u | 0,
    m = m << 12 | m >>> 20,
    u ^= i = i + m | 0,
    u = u << 8 | u >>> 24,
    m ^= q = q + u | 0,
    m = m << 7 | m >>> 25,
    v ^= j = j + n | 0,
    v = v << 16 | v >>> 16,
    n ^= r = r + v | 0,
    n = n << 12 | n >>> 20,
    v ^= j = j + n | 0,
    v = v << 8 | v >>> 24,
    n ^= r = r + v | 0,
    n = n << 7 | n >>> 25,
    w ^= k = k + o | 0,
    w = w << 16 | w >>> 16,
    o ^= s = s + w | 0,
    o = o << 12 | o >>> 20,
    w ^= k = k + o | 0,
    w = w << 8 | w >>> 24,
    o ^= s = s + w | 0,
    o = o << 7 | o >>> 25,
    x ^= l = l + p | 0,
    x = x << 16 | x >>> 16,
    p ^= t = t + x | 0,
    p = p << 12 | p >>> 20,
    x ^= l = l + p | 0,
    x = x << 8 | x >>> 24,
    p ^= t = t + x | 0,
    p = p << 7 | p >>> 25,
    x ^= i = i + n | 0,
    x = x << 16 | x >>> 16,
    n ^= s = s + x | 0,
    n = n << 12 | n >>> 20,
    x ^= i = i + n | 0,
    x = x << 8 | x >>> 24,
    n ^= s = s + x | 0,
    n = n << 7 | n >>> 25,
    u ^= j = j + o | 0,
    u = u << 16 | u >>> 16,
    o ^= t = t + u | 0,
    o = o << 12 | o >>> 20,
    u ^= j = j + o | 0,
    u = u << 8 | u >>> 24,
    o ^= t = t + u | 0,
    o = o << 7 | o >>> 25,
    v ^= k = k + p | 0,
    v = v << 16 | v >>> 16,
    p ^= q = q + v | 0,
    p = p << 12 | p >>> 20,
    v ^= k = k + p | 0,
    v = v << 8 | v >>> 24,
    p ^= q = q + v | 0,
    p = p << 7 | p >>> 25,
    w ^= l = l + m | 0,
    w = w << 16 | w >>> 16,
    m ^= r = r + w | 0,
    m = m << 12 | m >>> 20,
    w ^= l = l + m | 0,
    w = w << 8 | w >>> 24,
    m ^= r = r + w | 0,
    m = m << 7 | m >>> 25; while (--z);
  to[0] = Words.EXPA + i, to[1] = Words.ND_3 + j, to[2] = Words["2_BY"] + k;
  to[3] = Words.TE_K + l, to[4] = a + m, to[5] = b + n, to[6] = c + o;
  to[7] = d + p, to[8] = e + q, to[9] = f + r, to[10] = g + s, to[11] = h + t;
  to[12] = count + u, to[13] = iv0 + v, to[14] = iv1 + w, to[15] = iv2 + x;
};
/** Fills a block-0 key and returns a subkey. */
export const hchacha = (
  key: DataView,
  iv: DataView,
  to: Uint32Array,
): DataView<ArrayBuffer> => {
  const subkey = new DataView(new ArrayBuffer(32));
  chacha(
    key,
    iv.getUint32(0, true),
    iv.getUint32(4, true),
    iv.getUint32(8, true),
    iv.getUint32(12, true),
    to,
  );
  subkey.setUint32(0, to[0] - Words.EXPA, true);
  subkey.setUint32(4, to[1] - Words.ND_3, true);
  subkey.setUint32(8, to[2] - Words["2_BY"], true);
  subkey.setUint32(12, to[3] - Words.TE_K, true);
  subkey.setUint32(16, to[12] - iv.getUint32(0, true), true);
  subkey.setUint32(20, to[13] - iv.getUint32(4, true), true);
  subkey.setUint32(24, to[14] - iv.getUint32(8, true), true);
  subkey.setUint32(28, to[15] - iv.getUint32(12, true), true);
  return subkey;
};
