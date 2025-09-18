const enum W {
  EXPA = 0x61707865,
  ND_3 = 0x3320646e,
  "2_BY" = 0x79622d32,
  TE_K = 0x6b206574,
}
/** Updates a ChaCha20 block. */
export const chacha = (
  key: Uint32Array,
  count: number,
  iv0: number,
  iv1: number,
  iv2: number,
  $: Uint32Array,
): void => {
  let a = W.EXPA, b = W.ND_3, c = W["2_BY"], d = W.TE_K, e = key[0], f = key[1];
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
  $[0] = W.EXPA + a, $[1] = W.ND_3 + b, $[2] = W["2_BY"] + c, $[3] = W.TE_K + d;
  $[4] = key[0] + e, $[5] = key[1] + f, $[6] = key[2] + g, $[7] = key[3] + h;
  $[8] = key[4] + i, $[9] = key[5] + j, $[10] = key[6] + k, $[11] = key[7] + l;
  $[12] = count + m, $[13] = iv0 + n, $[14] = iv1 + o, $[15] = iv2 + p;
};
const SUBKEY = new Uint32Array(8), STATE = new Uint32Array(16);
/** Creates a subkey using part of the IV. */
export const hchacha = (
  key: Uint8Array,
  iv: Uint8Array,
): Uint32Array<ArrayBuffer> => {
  for (let z = 0; z < 32;) {
    SUBKEY[z >> 2] = key[z++] | key[z++] << 8 | key[z++] << 16 | key[z++] << 24;
  }
  const iv0 = iv[0] | iv[1] << 8 | iv[2] << 16 | iv[3] << 24;
  const iv1 = iv[4] | iv[5] << 8 | iv[6] << 16 | iv[7] << 24;
  const iv2 = iv[8] | iv[9] << 8 | iv[10] << 16 | iv[11] << 24;
  const iv3 = iv[12] | iv[13] << 8 | iv[14] << 16 | iv[15] << 24;
  chacha(SUBKEY, iv0, iv1, iv2, iv3, STATE), SUBKEY[0] = STATE[0] - W.EXPA;
  SUBKEY[1] = STATE[1] - W.ND_3, SUBKEY[2] = STATE[2] - W["2_BY"];
  SUBKEY[3] = STATE[3] - W.TE_K, SUBKEY[4] = STATE[12] - iv0;
  SUBKEY[5] = STATE[13] - iv1, SUBKEY[6] = STATE[14] - iv2;
  return SUBKEY[7] = STATE[15] - iv3, SUBKEY;
};
const VIEW = new DataView(STATE.buffer);
/** XORs text with a keystream. */
export const stream = (
  key: Uint32Array,
  iv0: number,
  iv1: number,
  iv2: number,
  $: Uint8Array,
  start_block: number,
): void => {
  const most = $.length & ~63, view = new DataView($.buffer, $.byteOffset);
  let offset, z = 0, y;
  while (z < most) {
    chacha(key, start_block++, iv0, iv1, iv2, STATE), offset = z, y = z += 64;
    do view.setUint32(
      y -= 4,
      view.getUint32(y, true) ^ STATE[y >> 2 & 15],
      true,
    ); while (y > offset);
  }
  if (most < $.length) {
    chacha(key, start_block, iv0, iv1, iv2, STATE), y = 0;
    do $[z] ^= VIEW.getUint8(y++); while (++z < $.length);
  }
};
