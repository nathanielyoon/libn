const C0 = 0x61707865, C1 = 0x3320646e, C2 = 0x79622d32, C3 = 0x6b206574;
/** Updates a ChaCha20 block. */
export const chacha = (
  key: Uint32Array,
  count: number,
  iv0: number,
  iv1: number,
  iv2: number,
  fill: Uint32Array,
): void => {
  let a = C0, b = C1, c = C2, d = C3, e = key[0], f = key[1];
  let g = key[2], h = key[3], i = key[4], j = key[5], k = key[6], l = key[7];
  let m = count, n = iv0, o = iv1, p = iv2, z = 10;
  do m ^= a = a + e | 0,
    m = m << 16 | m >>> 16,
    e ^= i = i + m | 0,
    e = e << 12 | e >>> 20,
    m ^= a = a + e | 0,
    m = m << 8 | m >>> 24,
    e ^= i = i + m | 0,
    e = e << 7 | e >>> 25,
    n ^= b = b + f | 0,
    n = n << 16 | n >>> 16,
    f ^= j = j + n | 0,
    f = f << 12 | f >>> 20,
    n ^= b = b + f | 0,
    n = n << 8 | n >>> 24,
    f ^= j = j + n | 0,
    f = f << 7 | f >>> 25,
    o ^= c = c + g | 0,
    o = o << 16 | o >>> 16,
    g ^= k = k + o | 0,
    g = g << 12 | g >>> 20,
    o ^= c = c + g | 0,
    o = o << 8 | o >>> 24,
    g ^= k = k + o | 0,
    g = g << 7 | g >>> 25,
    p ^= d = d + h | 0,
    p = p << 16 | p >>> 16,
    h ^= l = l + p | 0,
    h = h << 12 | h >>> 20,
    p ^= d = d + h | 0,
    p = p << 8 | p >>> 24,
    h ^= l = l + p | 0,
    h = h << 7 | h >>> 25,
    p ^= a = a + f | 0,
    p = p << 16 | p >>> 16,
    f ^= k = k + p | 0,
    f = f << 12 | f >>> 20,
    p ^= a = a + f | 0,
    p = p << 8 | p >>> 24,
    f ^= k = k + p | 0,
    f = f << 7 | f >>> 25,
    m ^= b = b + g | 0,
    m = m << 16 | m >>> 16,
    g ^= l = l + m | 0,
    g = g << 12 | g >>> 20,
    m ^= b = b + g | 0,
    m = m << 8 | m >>> 24,
    g ^= l = l + m | 0,
    g = g << 7 | g >>> 25,
    n ^= c = c + h | 0,
    n = n << 16 | n >>> 16,
    h ^= i = i + n | 0,
    h = h << 12 | h >>> 20,
    n ^= c = c + h | 0,
    n = n << 8 | n >>> 24,
    h ^= i = i + n | 0,
    h = h << 7 | h >>> 25,
    o ^= d = d + e | 0,
    o = o << 16 | o >>> 16,
    e ^= j = j + o | 0,
    e = e << 12 | e >>> 20,
    o ^= d = d + e | 0,
    o = o << 8 | o >>> 24,
    e ^= j = j + o | 0,
    e = e << 7 | e >>> 25; while (--z);
  fill[0] = C0 + a, fill[1] = C1 + b, fill[2] = C2 + c;
  fill[3] = C3 + d, fill[4] = key[0] + e, fill[5] = key[1] + f;
  fill[6] = key[2] + g, fill[7] = key[3] + h, fill[8] = key[4] + i;
  fill[9] = key[5] + j, fill[10] = key[6] + k, fill[11] = key[7] + l;
  fill[12] = count + m, fill[13] = iv0 + n, fill[14] = iv1 + o;
  fill[15] = iv2 + p;
};
const SUBKEY = /* @__PURE__ */ new Uint32Array(8);
const STATE = /* @__PURE__ */ new Uint32Array(16);
const VIEW = /* @__PURE__ */ (() => new DataView(STATE.buffer))();
/** Creates a subkey using part of the IV. */
export const hchacha = (
  key: Uint8Array,
  iv: Uint8Array,
): Uint32Array<ArrayBuffer> => {
  for (let z = 0; z < 32; z += 4) {
    SUBKEY[z >> 2] = key[z] | key[z + 1] << 8 | key[z + 2] << 16 |
      key[z + 3] << 24;
  }
  const iv0 = iv[0] | iv[1] << 8 | iv[2] << 16 | iv[3] << 24;
  const iv1 = iv[4] | iv[5] << 8 | iv[6] << 16 | iv[7] << 24;
  const iv2 = iv[8] | iv[9] << 8 | iv[10] << 16 | iv[11] << 24;
  const iv3 = iv[12] | iv[13] << 8 | iv[14] << 16 | iv[15] << 24;
  chacha(SUBKEY, iv0, iv1, iv2, iv3, STATE), SUBKEY[0] = STATE[0] - C0;
  SUBKEY[1] = STATE[1] - C1, SUBKEY[2] = STATE[2] - C2;
  SUBKEY[3] = STATE[3] - C3, SUBKEY[4] = STATE[12] - iv0;
  SUBKEY[5] = STATE[13] - iv1, SUBKEY[6] = STATE[14] - iv2;
  return SUBKEY[7] = STATE[15] - iv3, SUBKEY;
};
/** XORs text with a keystream. */
export const xor = (
  key: Uint32Array,
  iv0: number,
  iv1: number,
  iv2: number,
  text: Uint8Array,
  startBlock: number,
): void => {
  const max = text.length & ~63;
  let view = new DataView(text.buffer, text.byteOffset), offset, z = 0, y;
  while (z < max) {
    chacha(key, startBlock++, iv0, iv1, iv2, STATE), offset = z, y = z += 64;
    do view.setUint32(
      y -= 4,
      view.getUint32(y, true) ^ STATE[y >> 2 & 15],
      true,
    ); while (y > offset);
  }
  if (max !== text.length) {
    chacha(key, startBlock, iv0, iv1, iv2, STATE), view = VIEW, y = 0;
    do text[z] ^= view.getUint8(y++); while (++z < text.length);
  }
};
