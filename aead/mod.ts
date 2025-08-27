const enum Num {
  A = 0x61707865, // "expa"
  B = 0x3320646e, // "nd 3"
  C = 0x79622d32, // "2-by"
  D = 0x6b206574, // "te k"
}
const chacha = (
  key: DataView,
  count: number,
  iv0: number,
  iv1: number,
  iv2: number,
  to: Uint32Array,
) => {
  const a = key.getUint32(0, true), b = key.getUint32(4, true);
  const c = key.getUint32(8, true), d = key.getUint32(12, true);
  const e = key.getUint32(16, true), f = key.getUint32(20, true);
  const g = key.getUint32(24, true), h = key.getUint32(28, true);
  let i = Num.A, j = Num.B, k = Num.C, l = Num.D, m = a, n = b, o = c, p = d;
  let q = e, r = f, s = g, t = h, u = count, v = iv0, w = iv1, x = iv2, z = 10;
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
  to[0] = Num.A + i, to[1] = Num.B + j, to[2] = Num.C + k, to[3] = Num.D + l;
  to[4] = a + m, to[5] = b + n, to[6] = c + o, to[7] = d + p, to[8] = e + q;
  to[9] = f + r, to[10] = g + s, to[11] = h + t, to[12] = count + u;
  to[13] = iv0 + v, to[14] = iv1 + w, to[15] = iv2 + x;
};
const hchacha = (use: Uint32Array, key: DataView, iv: DataView) => {
  const a = new DataView(new ArrayBuffer(32));
  const b = iv.getUint32(0, true), c = iv.getUint32(4, true);
  const d = iv.getUint32(8, true), e = iv.getUint32(12, true);
  chacha(key, b, c, d, e, use), a.setUint32(0, use[0] - Num.A, true);
  a.setUint32(4, use[1] - Num.B, true), a.setUint32(8, use[2] - Num.C, true);
  a.setUint32(12, use[3] - Num.D, true), a.setUint32(16, use[12] - b, true);
  a.setUint32(20, use[13] - c, true), a.setUint32(24, use[14] - d, true);
  return a.setUint32(28, use[15] - e, true), a;
};
const xor = (key: DataView, iv: DataView, $: Uint8Array, to: Uint8Array) => {
  const a = iv.getUint32(16, true), b = iv.getUint32(20, true);
  const c = $.length & ~63, d = new Uint32Array(16);
  let e = new DataView(to.buffer, to.byteOffset), z = 0, y = 1, x;
  while (z < c) {
    chacha(key, y++, x = 0, a, b, d);
    do e.setUint32( // xor word
      z,
      ($[z++] | $[z++] << 8 | $[z++] << 16 | $[z++] << 24) ^ d[x],
      true,
    ); while (++x < 16);
  }
  if (c < $.length) {
    chacha(key, y, x = 0, a, b, d), e = new DataView(d.buffer);
    do to[z] = $[z] ^ e.getUint8(x++); while (++z < $.length); // xor byte
  }
};
const poly = (key: DataView, $: Uint8Array) => {
  let a = key.getUint16(0, true), b = key.getUint16(2, true);
  let c = key.getUint16(4, true), d = key.getUint16(6, true), e = a & 8191;
  let f = (a >> 13 | b << 3) & 8191, g = (b >> 10 | c << 6) & 0x1f03;
  a = key.getUint16(8, true), b = key.getUint16(10, true);
  let h = (c >> 7 | d << 9) & 8191, i = (d >> 4 | a << 12) & 0xff;
  let j = (a >> 14 | b << 2) & 8191, k = a >> 1 & 0x1ffe;
  c = key.getUint16(12, true), d = key.getUint16(14, true);
  let l = (b >> 11 | c << 5) & 0x1f81, m = (c >> 8 | d << 8) & 8191;
  let n = d >> 5 & 0x7f, o = 0, p = 0, q = 0, r, s, t, u, v, w, x, y = 2048;
  let z = 0, a0 = 0, a1 = 0, a2 = 0, a3 = 0, a4 = 0, a5 = 0, a6 = 0;
  while (y && z < $.length) {
    if ($.length - z < 16) {
      const _ = new Uint8Array(16); // pad rest of buffer
      _.set($.subarray(z)), y = z = _[$.length - z]++, $ = _; // reset index
    }
    a = $[z++] | $[z++] << 8, b = $[z++] | $[z++] << 8, r = (a & 8191) + p;
    s = ((a >> 13 | b << 3) & 8191) + q, c = $[z++] | $[z++] << 8;
    t = ((b >> 10 | c << 6) & 8191) + a0, d = $[z++] | $[z++] << 8;
    u = ((c >> 7 | d << 9) & 8191) + a1, a = $[z++] | $[z++] << 8;
    v = ((d >> 4 | a << 12) & 8191) + a2, w = ((a >> 1) & 8191) + a3;
    b = $[z++] | $[z++] << 8, x = ((a >> 14 | b << 2) & 8191) + a4;
    c = $[z++] | $[z++] << 8, p = ((b >> 11 | c << 5) & 8191) + a5;
    d = $[z++] | $[z++] << 8, b = r * e + (s * n + t * m + u * l + v * j) * 5;
    q = a6 + ((c >> 8 | d << 8) & 8191), o += d >> 5 | y, a = b >> 13;
    b = (b & 8191) + (w * k + x * i + p * h + q * g + f * o) * 5, c = b >> 13;
    c += a + r * f + s * e + (t * n + u * m + v * l) * 5, a = c >> 13;
    c = (c & 8191) + (w * j + x * k + p * i + q * h + g * o) * 5, d = c >> 13;
    d += a + r * g + s * f + t * e + (u * n + v * m) * 5, a = d >> 13;
    d = (d & 8191) + (w * l + x * j + p * k + q * i + h * o) * 5, a0 = d & 8191;
    d = a + (d >>> 13) + r * h + s * g + t * f + u * e + v * n * 5, a = d >> 13;
    d = (d & 8191) + (w * m + x * l + p * j + q * k + i * o) * 5, a1 = d & 8191;
    d = a + (d >>> 13) + r * i + s * h + t * g + u * f + v * e, a = d >> 13;
    d = (d & 8191) + (w * n + x * m + p * l + q * j + k * o) * 5, a2 = d & 8191;
    d = a + (d >>> 13) + r * k + s * i + t * h + u * g + v * f, a = d >> 13;
    d = (d & 8191) + w * e + (x * n + p * m + q * l + j * o) * 5, a3 = d & 8191;
    d = a + (d >>> 13) + r * j + s * k + t * i + u * h + v * g, a = d >> 13;
    d = (d & 8191) + w * f + x * e + (p * n + q * m + l * o) * 5, a4 = d & 8191;
    d = a + (d >>> 13) + r * l + s * j + t * k + u * i + v * h, a = d >> 13;
    d = (d & 8191) + w * g + x * f + p * e + (q * n + m * o) * 5, a5 = d & 8191;
    d = a + (d >>> 13) + r * m + s * l + t * j + u * k + v * i, a = d >> 13;
    d = (d & 8191) + w * h + x * g + p * f + q * e + o * n * 5, a6 = d & 8191;
    d = a + (d >>> 13) + r * n + s * m + t * l + u * j + v * k;
    o = (d & 8191) + w * i + x * h + p * g + q * f + o * e;
    p = ((d >> 13) + (o >> 13)) * 5 + (b & 8191), q = (c & 8191) + (p >> 13);
    b = r * e + (s * n + t * m + u * l + v * j) * 5, p &= 8191, o &= 8191;
  }
  r = a0 + (q >> 13), s = a1 + (r >> 13), r &= 8191, t = a2 + (s >> 13);
  s &= 8191, u = a3 + (t >> 13), t &= 8191, v = a4 + (u >> 13), u &= 8191;
  w = a5 + (v >> 13), v &= 8191, x = a6 + (w >> 13), w &= 8191, o += x >> 13;
  x &= 8191, p += (o >> 13) * 5, o &= 8191, q = (q & 8191) + (p >> 13);
  p &= 8191, r = r + (q >> 13) & 8191, q &= 8191, e = p + 5, f = q + (e >> 13);
  g = r + (f >> 13), h = s + (g >> 13), i = t + (h >> 13), k = u + (i >> 13);
  j = v + (k >> 13), l = w + (j >> 13), m = x + (l >> 13), n = o + (m >> 13);
  a = -(n >> 13 ^ 1), b = ~a & 8191, n = (n & 8191) - (1 << 13);
  p = p & a | e & b, q = q & a | f & b, r = r & a | g & b, s = s & a | h & b;
  t = t & a | i & b, u = u & a | k & b, v = v & a | j & b, w = w & a | l & b;
  x = x & a | m & b, o = o & a | n & b, $ = new Uint8Array(16); // allocate tag
  $[0] = p = ((p | q << 13) & 65535) + key.getUint16(16, true), $[1] = p >> 8;
  $[2] = q = (p >> 16) + (q >> 3 | r << 10 & 65535) + key.getUint16(18, true);
  $[4] = r = (q >> 16) + (r >> 6 | s << 7 & 65535) + key.getUint16(20, true);
  $[6] = s = (r >> 16) + (s >> 9 | t << 4 & 65535) + key.getUint16(22, true);
  t = (s >> 16) + ((t >> 12 | u << 1 | v << 14) & 65535), $[3] = q >> 8;
  $[8] = t += key.getUint16(24, true), $[5] = r >> 8, $[7] = s >> 8;
  $[10] = u = (t >> 16) + (v >> 2 | w << 11 & 65535) + key.getUint16(26, true);
  $[12] = v = (u >> 16) + (w >> 5 | x << 8 & 65535) + key.getUint16(28, true);
  $[14] = w = (v >> 16) + (x >> 8 | o << 5 & 65535) + key.getUint16(30, true);
  return $[9] = t >> 8, $[11] = u >> 8, $[13] = v >> 8, $[15] = w >> 8, $;
};
const tag = (key: Uint32Array, $: Uint8Array, data: Uint8Array) => {
  const a = new DataView(key.buffer), b = data.length, c = $.length;
  const d = b + 15 & ~15, e = c + d + 15 & ~15, f = new Uint8Array(e + 16);
  f.set(data), f.set($, d), f[e] = b, f[e + 1] = b >> 8, f[e + 2] = b >> 16;
  f[e + 3] = b >> 24, f[e + 8] = c, f[e + 9] = c >> 8, f[e + 10] = c >> 16;
  return f[e + 11] = c >> 24, poly(a, f);
};
/** Authenticated encryption. */
export const xchachapoly = (
  key: Uint8Array,
  iv: Uint8Array,
  $: Uint8Array,
  data: Uint8Array,
): null | Uint8Array<ArrayBuffer> => {
  if (key.length !== 32 || iv.length !== 24) return null;
  const a = new Uint32Array(16), b = new DataView(iv.buffer, iv.byteOffset);
  const c = hchacha(a, new DataView(key.buffer, key.byteOffset), b);
  chacha(c, 0, 0, b.getUint32(16, true), b.getUint32(20, true), a);
  const d = $.length, e = new Uint8Array(d + 16);
  return xor(c, b, $, e), e.set(tag(a, e.subarray(0, d), data), d), e;
};
/** Authenticated decryption. */
export const polyxchacha = (
  key: Uint8Array,
  iv: Uint8Array,
  $: Uint8Array,
  data: Uint8Array,
): null | Uint8Array<ArrayBuffer> => {
  if (key.length !== 32 || iv.length !== 24) return null;
  const a = new Uint32Array(16), b = new DataView(iv.buffer, iv.byteOffset);
  const c = hchacha(a, new DataView(key.buffer, key.byteOffset), b);
  const d = $.length - 16, e = new Uint8Array(d);
  chacha(c, 0, 0, b.getUint32(16, true), b.getUint32(20, true), a);
  const f = tag(a, $.subarray(0, d), data);
  let z = 16, y = 0;
  do y |= f[--z] ^ $[d + z]; while (z); // compare tag
  return y ? null : (xor(c, b, $.subarray(0, d), e), e);
};
