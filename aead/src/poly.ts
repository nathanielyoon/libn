/** Computes a Poly1305 MAC. */
export const poly = (key: DataView, $: Uint8Array): Uint8Array => {
  let a = key.getUint16(0, true), b = key.getUint16(2, true);
  let c = key.getUint16(4, true), d = key.getUint16(6, true), e = a & 8191;
  let f = (a >> 13 | b << 3) & 8191, g = (b >> 10 | c << 6) & 7939;
  a = key.getUint16(8, true), b = key.getUint16(10, true);
  let h = (c >> 7 | d << 9) & 8191, i = (d >> 4 | a << 12) & 255;
  let j = (a >> 14 | b << 2) & 8191, k = a >> 1 & 8190;
  c = key.getUint16(12, true), d = key.getUint16(14, true);
  let l = (b >> 11 | c << 5) & 8065, m = (c >> 8 | d << 8) & 8191;
  let n = d >> 5 & 127, o = 0, p = 0, q = 0, r, s, t, u, v, w, x, z = 0;
  let d0 = 0, d1 = 0, d2 = 0, d3 = 0, d4 = 0, d5 = 0, d6 = 0, high_bit = 2048;
  while (high_bit && z < $.length) {
    if ($.length - z < 16) {
      const swap = new Uint8Array(16);
      swap.set($.subarray(z)), high_bit = z = swap[$.length - z]++, $ = swap;
    }
    a = $[z++] | $[z++] << 8, b = $[z++] | $[z++] << 8, r = (a & 8191) + p;
    s = ((a >> 13 | b << 3) & 8191) + q, c = $[z++] | $[z++] << 8;
    t = ((b >> 10 | c << 6) & 8191) + d0, d = $[z++] | $[z++] << 8;
    u = ((c >> 7 | d << 9) & 8191) + d1, a = $[z++] | $[z++] << 8;
    v = ((d >> 4 | a << 12) & 8191) + d2, w = ((a >> 1) & 8191) + d3;
    b = $[z++] | $[z++] << 8, x = ((a >> 14 | b << 2) & 8191) + d4;
    c = $[z++] | $[z++] << 8, p = ((b >> 11 | c << 5) & 8191) + d5;
    d = $[z++] | $[z++] << 8, b = r * e + (s * n + t * m + u * l + v * j) * 5;
    q = d6 + ((c >> 8 | d << 8) & 8191), o += d >> 5 | high_bit, a = b >> 13;
    b = (b & 8191) + (w * k + x * i + p * h + q * g + f * o) * 5, c = b >> 13;
    c += a + r * f + s * e + (t * n + u * m + v * l) * 5, a = c >> 13;
    c = (c & 8191) + (w * j + x * k + p * i + q * h + g * o) * 5, d = c >> 13;
    d += a + r * g + s * f + t * e + (u * n + v * m) * 5, a = d >> 13;
    d = (d & 8191) + (w * l + x * j + p * k + q * i + h * o) * 5, d0 = d & 8191;
    d = a + (d >>> 13) + r * h + s * g + t * f + u * e + v * n * 5, a = d >> 13;
    d = (d & 8191) + (w * m + x * l + p * j + q * k + i * o) * 5, d1 = d & 8191;
    d = a + (d >>> 13) + r * i + s * h + t * g + u * f + v * e, a = d >> 13;
    d = (d & 8191) + (w * n + x * m + p * l + q * j + k * o) * 5, d2 = d & 8191;
    d = a + (d >>> 13) + r * k + s * i + t * h + u * g + v * f, a = d >> 13;
    d = (d & 8191) + w * e + (x * n + p * m + q * l + j * o) * 5, d3 = d & 8191;
    d = a + (d >>> 13) + r * j + s * k + t * i + u * h + v * g, a = d >> 13;
    d = (d & 8191) + w * f + x * e + (p * n + q * m + l * o) * 5, d4 = d & 8191;
    d = a + (d >>> 13) + r * l + s * j + t * k + u * i + v * h, a = d >> 13;
    d = (d & 8191) + w * g + x * f + p * e + (q * n + m * o) * 5, d5 = d & 8191;
    d = a + (d >>> 13) + r * m + s * l + t * j + u * k + v * i, a = d >> 13;
    d = (d & 8191) + w * h + x * g + p * f + q * e + o * n * 5, d6 = d & 8191;
    d = a + (d >>> 13) + r * n + s * m + t * l + u * j + v * k;
    o = (d & 8191) + w * i + x * h + p * g + q * f + o * e;
    p = ((d >> 13) + (o >> 13)) * 5 + (b & 8191), q = (c & 8191) + (p >> 13);
    b = r * e + (s * n + t * m + u * l + v * j) * 5, p &= 8191, o &= 8191;
  }
  r = d0 + (q >> 13), s = d1 + (r >> 13), r &= 8191, t = d2 + (s >> 13);
  s &= 8191, u = d3 + (t >> 13), t &= 8191, v = d4 + (u >> 13), u &= 8191;
  w = d5 + (v >> 13), v &= 8191, x = d6 + (w >> 13), w &= 8191, o += x >> 13;
  x &= 8191, p += (o >> 13) * 5, o &= 8191, q = (q & 8191) + (p >> 13);
  p &= 8191, r = r + (q >> 13) & 8191, q &= 8191, e = p + 5, f = q + (e >> 13);
  g = r + (f >> 13), h = s + (g >> 13), i = t + (h >> 13), k = u + (i >> 13);
  j = v + (k >> 13), l = w + (j >> 13), m = x + (l >> 13), n = o + (m >> 13);
  a = -(n >> 13 ^ 1), b = ~a & 8191, n = (n & 8191) - (1 << 13);
  p = p & a | e & b, q = q & a | f & b, r = r & a | g & b, s = s & a | h & b;
  t = t & a | i & b, u = u & a | k & b, v = v & a | j & b, w = w & a | l & b;
  x = x & a | m & b, o = o & a | n & b, $ = new Uint8Array(16); // output now
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
