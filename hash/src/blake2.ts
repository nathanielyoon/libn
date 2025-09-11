import { type Hash, Mod, SHA256, SHA512 } from "./common.ts";

const PERMUTE = Uint8Array.from(
  "0123456789abcdefea489fd61c02b753b8c052fdae3671947931dcbe265a40f8905724afe1bc683d2c6a0b834d75fe19c51fed4a0763928bdb7ec13950f4862a6fe9b308c2d714a5a2847615fb9e3cd00123456789abcdefea489fd61c02b753",
  ($) => parseInt($, 16),
);
// State: `m[0:16] | h[0:8] | bytes in current block | t[0:2] | output length`.
const b2s_mix = ($: Uint32Array, final: 0 | 1) => {
  let a = $[16], b = $[17], c = $[18], d = $[19], e = $[20], f = $[21];
  let g = $[22], h = $[23], i = SHA256[0], j = SHA256[1], k = SHA256[2];
  let l = SHA256[3], m = SHA256[4] ^ $[25], n = SHA256[5] ^ $[26];
  let o = SHA256[6], p = SHA256[7], z = 0;
  if (final) o = ~o;
  do m ^= a = a + e + $[PERMUTE[z++]] >>> 0,
    m = m >>> 16 | m << 16,
    e ^= i = i + m >>> 0,
    e = e >>> 12 | e << 20,
    m ^= a = a + e + $[PERMUTE[z++]] >>> 0,
    m = m >>> 8 | m << 24,
    e ^= i = i + m >>> 0,
    e = e >>> 7 | e << 25,
    n ^= b = b + f + $[PERMUTE[z++]] >>> 0,
    n = n >>> 16 | n << 16,
    f ^= j = j + n >>> 0,
    f = f >>> 12 | f << 20,
    n ^= b = b + f + $[PERMUTE[z++]] >>> 0,
    n = n >>> 8 | n << 24,
    f ^= j = j + n >>> 0,
    f = f >>> 7 | f << 25,
    o ^= c = c + g + $[PERMUTE[z++]] >>> 0,
    o = o >>> 16 | o << 16,
    g ^= k = k + o >>> 0,
    g = g >>> 12 | g << 20,
    o ^= c = c + g + $[PERMUTE[z++]] >>> 0,
    o = o >>> 8 | o << 24,
    g ^= k = k + o >>> 0,
    g = g >>> 7 | g << 25,
    p ^= d = d + h + $[PERMUTE[z++]] >>> 0,
    p = p >>> 16 | p << 16,
    h ^= l = l + p >>> 0,
    h = h >>> 12 | h << 20,
    p ^= d = d + h + $[PERMUTE[z++]] >>> 0,
    p = p >>> 8 | p << 24,
    h ^= l = l + p >>> 0,
    h = h >>> 7 | h << 25,
    p ^= a = a + f + $[PERMUTE[z++]] >>> 0,
    p = p >>> 16 | p << 16,
    f ^= k = k + p >>> 0,
    f = f >>> 12 | f << 20,
    p ^= a = a + f + $[PERMUTE[z++]] >>> 0,
    p = p >>> 8 | p << 24,
    f ^= k = k + p >>> 0,
    f = f >>> 7 | f << 25,
    m ^= b = b + g + $[PERMUTE[z++]] >>> 0,
    m = m >>> 16 | m << 16,
    g ^= l = l + m >>> 0,
    g = g >>> 12 | g << 20,
    m ^= b = b + g + $[PERMUTE[z++]] >>> 0,
    m = m >>> 8 | m << 24,
    g ^= l = l + m >>> 0,
    g = g >>> 7 | g << 25,
    n ^= c = c + h + $[PERMUTE[z++]] >>> 0,
    n = n >>> 16 | n << 16,
    h ^= i = i + n >>> 0,
    h = h >>> 12 | h << 20,
    n ^= c = c + h + $[PERMUTE[z++]] >>> 0,
    n = n >>> 8 | n << 24,
    h ^= i = i + n >>> 0,
    h = h >>> 7 | h << 25,
    o ^= d = d + e + $[PERMUTE[z++]] >>> 0,
    o = o >>> 16 | o << 16,
    e ^= j = j + o >>> 0,
    e = e >>> 12 | e << 20,
    o ^= d = d + e + $[PERMUTE[z++]] >>> 0,
    o = o >>> 8 | o << 24,
    e ^= j = j + o >>> 0,
    e = e >>> 7 | e << 25; while (z < 160);
  $[16] ^= a ^ i, $[17] ^= b ^ j, $[18] ^= c ^ k, $[19] ^= d ^ l;
  $[20] ^= e ^ m, $[21] ^= f ^ n, $[22] ^= g ^ o, $[23] ^= h ^ p;
  $.fill(0, 0, 16);
};
/** Initializes the BLAKE2s state. */
export const b2s_new = (
  key?: Uint8Array,
  length = 32,
): Uint32Array<ArrayBuffer> => {
  const state = new Uint32Array(28);
  key &&= key.subarray(0, 32), state[27] = length = length >>> 0 || 1;
  state.set(SHA256, 16), state[16] ^= length | key?.length! << 8 | 0x01010000;
  return key?.length && (b2s_set(state, key), state[24] = 64), state;
};
/** Processes a chunk of data and updates the BLAKE2s state. */
export const b2s_set = <A extends Uint32Array>($: A, input: Uint8Array): A => {
  for (let z = 0; z < input.length; ++z) {
    if ($[24] === 64) $[25] += 64, $[25] < 64 && ++$[26], b2s_mix($, $[24] = 0);
    $[$[24] >> 2] |= input[z] << ($[24]++ << 3);
  }
  return $;
};
/** Finalizes the BLAKE2s state into a fixed-length hash. */
export const b2s_get = ($: Uint32Array): Uint8Array<ArrayBuffer> => {
  $[25] += $[24], $[25] < $[24] && ++$[26], b2s_mix($, 1);
  const out = new Uint8Array($[27]);
  for (let z = 0; z < out.length; ++z) out[z] = $[z + 64 >> 2] >> (z << 3);
  return out;
};
/** Hashes with BLAKE2s. */
export const b2s: Hash<[$: Uint8Array, key?: Uint8Array, length?: number]> = (
  $: Uint8Array,
  key?: Uint8Array,
  length?: number,
): Uint8Array<ArrayBuffer> => b2s_get(b2s_set(b2s_new(key, length), $));
// Each accessed word is split into two 32-bit halves, so the indices are really
// `index * 2` and `index * 2 + 1`.
const PERMUTE_BOTH = PERMUTE.map(($) => $ << 1);
// The BLAKE2b IV is SHA-512's but little-endian (with regard to word halves).
const B2B = SHA512.map((_, z, $) => $[z ^ 1]);
// State: `m[0:32] | h[0:16] | bytes in current block | t[0:4] | output length`.
const b2b_mix = ($: Uint32Array, final: 0 | 1) => {
  let a0 = $[32], a1 = $[33], b0 = $[34], b1 = $[35], c0 = $[36], c1 = $[37];
  let d0 = $[38], d1 = $[39], e0 = $[40], e1 = $[41], f0 = $[42], f1 = $[43];
  let g0 = $[44], g1 = $[45], h0 = $[46], h1 = $[47], i0 = B2B[0], i1 = B2B[1];
  let j0 = B2B[2], j1 = B2B[3], k0 = B2B[4], k1 = B2B[5], l0 = B2B[6];
  let l1 = B2B[7], m0 = B2B[8] ^ $[49], m1 = B2B[9] ^ $[50];
  let n0 = B2B[10] ^ $[51], n1 = B2B[11] ^ $[52], o0 = B2B[12], o1 = B2B[13];
  let p0 = B2B[14], p1 = B2B[15], q, z = 0;
  if (final) o0 = ~o0, o1 = ~o1;
  do a0 += e0 + $[PERMUTE_BOTH[z]],
    a1 = a1 + e1 + $[PERMUTE_BOTH[z++] + 1] + (a0 / Mod.U | 0) | 0,
    a0 >>>= 0,
    q = m0 ^ a0,
    i0 += m0 = (m1 ^ a1) >>> 0,
    m1 = q >>> 0,
    e1 ^= i1 = i1 + m1 + (i0 / Mod.U | 0) | 0,
    i0 >>>= 0,
    q = e0 ^ i0,
    e0 = (q >>> 24 ^ e1 << 8) >>> 0,
    e1 = (e1 >>> 24 ^ q << 8) >>> 0,
    a0 += e0 + $[PERMUTE_BOTH[z]],
    m1 ^= a1 = a1 + e1 + $[PERMUTE_BOTH[z++] + 1] + (a0 / Mod.U | 0) | 0,
    a0 >>>= 0,
    q = m0 ^ a0,
    i0 += m0 = (q >>> 16 ^ m1 << 16) >>> 0,
    m1 = (m1 >>> 16 ^ q << 16) >>> 0,
    e1 ^= i1 = i1 + m1 + (i0 / Mod.U | 0) | 0,
    i0 >>>= 0,
    q = e0 ^ i0,
    e0 = (e1 >>> 31 ^ q << 1) >>> 0,
    e1 = (q >>> 31 ^ e1 << 1) >>> 0,
    b0 += f0 + $[PERMUTE_BOTH[z]],
    b1 = b1 + f1 + $[PERMUTE_BOTH[z++] + 1] + (b0 / Mod.U | 0) | 0,
    b0 >>>= 0,
    q = n0 ^ b0,
    j0 += n0 = (n1 ^ b1) >>> 0,
    n1 = q >>> 0,
    f1 ^= j1 = j1 + n1 + (j0 / Mod.U | 0) | 0,
    j0 >>>= 0,
    q = f0 ^ j0,
    f0 = (q >>> 24 ^ f1 << 8) >>> 0,
    f1 = (f1 >>> 24 ^ q << 8) >>> 0,
    b0 += f0 + $[PERMUTE_BOTH[z]],
    n1 ^= b1 = b1 + f1 + $[PERMUTE_BOTH[z++] + 1] + (b0 / Mod.U | 0) | 0,
    b0 >>>= 0,
    q = n0 ^ b0,
    j0 += n0 = (q >>> 16 ^ n1 << 16) >>> 0,
    n1 = (n1 >>> 16 ^ q << 16) >>> 0,
    f1 ^= j1 = j1 + n1 + (j0 / Mod.U | 0) | 0,
    j0 >>>= 0,
    q = f0 ^ j0,
    f0 = (f1 >>> 31 ^ q << 1) >>> 0,
    f1 = (q >>> 31 ^ f1 << 1) >>> 0,
    c0 += g0 + $[PERMUTE_BOTH[z]],
    c1 = c1 + g1 + $[PERMUTE_BOTH[z++] + 1] + (c0 / Mod.U | 0) | 0,
    c0 >>>= 0,
    q = o0 ^ c0,
    k0 += o0 = (o1 ^ c1) >>> 0,
    o1 = q >>> 0,
    g1 ^= k1 = k1 + o1 + (k0 / Mod.U | 0) | 0,
    k0 >>>= 0,
    q = g0 ^ k0,
    g0 = (q >>> 24 ^ g1 << 8) >>> 0,
    g1 = (g1 >>> 24 ^ q << 8) >>> 0,
    c0 += g0 + $[PERMUTE_BOTH[z]],
    o1 ^= c1 = c1 + g1 + $[PERMUTE_BOTH[z++] + 1] + (c0 / Mod.U | 0) | 0,
    c0 >>>= 0,
    q = o0 ^ c0,
    k0 += o0 = (q >>> 16 ^ o1 << 16) >>> 0,
    o1 = (o1 >>> 16 ^ q << 16) >>> 0,
    g1 ^= k1 = k1 + o1 + (k0 / Mod.U | 0) | 0,
    k0 >>>= 0,
    q = g0 ^ k0,
    g0 = (g1 >>> 31 ^ q << 1) >>> 0,
    g1 = (q >>> 31 ^ g1 << 1) >>> 0,
    d0 += h0 + $[PERMUTE_BOTH[z]],
    d1 = d1 + h1 + $[PERMUTE_BOTH[z++] + 1] + (d0 / Mod.U | 0) | 0,
    d0 >>>= 0,
    q = p0 ^ d0,
    l0 += p0 = (p1 ^ d1) >>> 0,
    p1 = q >>> 0,
    h1 ^= l1 = l1 + p1 + (l0 / Mod.U | 0) | 0,
    l0 >>>= 0,
    q = h0 ^ l0,
    h0 = (q >>> 24 ^ h1 << 8) >>> 0,
    h1 = (h1 >>> 24 ^ q << 8) >>> 0,
    d0 += h0 + $[PERMUTE_BOTH[z]],
    p1 ^= d1 = d1 + h1 + $[PERMUTE_BOTH[z++] + 1] + (d0 / Mod.U | 0) | 0,
    d0 >>>= 0,
    q = p0 ^ d0,
    l0 += p0 = (q >>> 16 ^ p1 << 16) >>> 0,
    p1 = (p1 >>> 16 ^ q << 16) >>> 0,
    h1 ^= l1 = l1 + p1 + (l0 / Mod.U | 0) | 0,
    l0 >>>= 0,
    q = h0 ^ l0,
    h0 = (h1 >>> 31 ^ q << 1) >>> 0,
    h1 = (q >>> 31 ^ h1 << 1) >>> 0,
    a0 += f0 + $[PERMUTE_BOTH[z]],
    a1 = a1 + f1 + $[PERMUTE_BOTH[z++] + 1] + (a0 / Mod.U | 0) | 0,
    a0 >>>= 0,
    q = p0 ^ a0,
    k0 += p0 = (p1 ^ a1) >>> 0,
    p1 = q >>> 0,
    f1 ^= k1 = k1 + p1 + (k0 / Mod.U | 0) | 0,
    k0 >>>= 0,
    q = f0 ^ k0,
    f0 = (q >>> 24 ^ f1 << 8) >>> 0,
    f1 = (f1 >>> 24 ^ q << 8) >>> 0,
    a0 += f0 + $[PERMUTE_BOTH[z]],
    p1 ^= a1 = a1 + f1 + $[PERMUTE_BOTH[z++] + 1] + (a0 / Mod.U | 0) | 0,
    a0 >>>= 0,
    q = p0 ^ a0,
    k0 += p0 = (q >>> 16 ^ p1 << 16) >>> 0,
    p1 = (p1 >>> 16 ^ q << 16) >>> 0,
    f1 ^= k1 = k1 + p1 + (k0 / Mod.U | 0) | 0,
    k0 >>>= 0,
    q = f0 ^ k0,
    f0 = (f1 >>> 31 ^ q << 1) >>> 0,
    f1 = (q >>> 31 ^ f1 << 1) >>> 0,
    b0 += g0 + $[PERMUTE_BOTH[z]],
    b1 = b1 + g1 + $[PERMUTE_BOTH[z++] + 1] + (b0 / Mod.U | 0) | 0,
    b0 >>>= 0,
    q = m0 ^ b0,
    l0 += m0 = (m1 ^ b1) >>> 0,
    m1 = q >>> 0,
    g1 ^= l1 = l1 + m1 + (l0 / Mod.U | 0) | 0,
    l0 >>>= 0,
    q = g0 ^ l0,
    g0 = (q >>> 24 ^ g1 << 8) >>> 0,
    g1 = (g1 >>> 24 ^ q << 8) >>> 0,
    b0 += g0 + $[PERMUTE_BOTH[z]],
    m1 ^= b1 = b1 + g1 + $[PERMUTE_BOTH[z++] + 1] + (b0 / Mod.U | 0) | 0,
    b0 >>>= 0,
    q = m0 ^ b0,
    l0 += m0 = (q >>> 16 ^ m1 << 16) >>> 0,
    m1 = (m1 >>> 16 ^ q << 16) >>> 0,
    g1 ^= l1 = l1 + m1 + (l0 / Mod.U | 0) | 0,
    l0 >>>= 0,
    q = g0 ^ l0,
    g0 = (g1 >>> 31 ^ q << 1) >>> 0,
    g1 = (q >>> 31 ^ g1 << 1) >>> 0,
    c0 += h0 + $[PERMUTE_BOTH[z]],
    c1 = c1 + h1 + $[PERMUTE_BOTH[z++] + 1] + (c0 / Mod.U | 0) | 0,
    c0 >>>= 0,
    q = n0 ^ c0,
    i0 += n0 = (n1 ^ c1) >>> 0,
    n1 = q >>> 0,
    h1 ^= i1 = i1 + n1 + (i0 / Mod.U | 0) | 0,
    i0 >>>= 0,
    q = h0 ^ i0,
    h0 = (q >>> 24 ^ h1 << 8) >>> 0,
    h1 = (h1 >>> 24 ^ q << 8) >>> 0,
    c0 += h0 + $[PERMUTE_BOTH[z]],
    n1 ^= c1 = c1 + h1 + $[PERMUTE_BOTH[z++] + 1] + (c0 / Mod.U | 0) | 0,
    c0 >>>= 0,
    q = n0 ^ c0,
    i0 += n0 = (q >>> 16 ^ n1 << 16) >>> 0,
    n1 = (n1 >>> 16 ^ q << 16) >>> 0,
    h1 ^= i1 = i1 + n1 + (i0 / Mod.U | 0) | 0,
    i0 >>>= 0,
    q = h0 ^ i0,
    h0 = (h1 >>> 31 ^ q << 1) >>> 0,
    h1 = (q >>> 31 ^ h1 << 1) >>> 0,
    d0 += e0 + $[PERMUTE_BOTH[z]],
    d1 = d1 + e1 + $[PERMUTE_BOTH[z++] + 1] + (d0 / Mod.U | 0) | 0,
    d0 >>>= 0,
    q = o0 ^ d0,
    j0 += o0 = (o1 ^ d1) >>> 0,
    o1 = q >>> 0,
    e1 ^= j1 = j1 + o1 + (j0 / Mod.U | 0) | 0,
    j0 >>>= 0,
    q = e0 ^ j0,
    e0 = (q >>> 24 ^ e1 << 8) >>> 0,
    e1 = (e1 >>> 24 ^ q << 8) >>> 0,
    d0 += e0 + $[PERMUTE_BOTH[z]],
    o1 ^= d1 = d1 + e1 + $[PERMUTE_BOTH[z++] + 1] + (d0 / Mod.U | 0) | 0,
    d0 >>>= 0,
    q = o0 ^ d0,
    j0 += o0 = (q >>> 16 ^ o1 << 16) >>> 0,
    o1 = (o1 >>> 16 ^ q << 16) >>> 0,
    e1 ^= j1 = j1 + o1 + (j0 / Mod.U | 0) | 0,
    j0 >>>= 0,
    q = e0 ^ j0,
    e0 = (e1 >>> 31 ^ q << 1) >>> 0,
    e1 = (q >>> 31 ^ e1 << 1) >>> 0; while (z < 192);
  $[32] ^= a0 ^ i0, $[33] ^= a1 ^ i1, $[34] ^= b0 ^ j0, $[35] ^= b1 ^ j1;
  $[36] ^= c0 ^ k0, $[37] ^= c1 ^ k1, $[38] ^= d0 ^ l0, $[39] ^= d1 ^ l1;
  $[40] ^= e0 ^ m0, $[41] ^= e1 ^ m1, $[42] ^= f0 ^ n0, $[43] ^= f1 ^ n1;
  $[44] ^= g0 ^ o0, $[45] ^= g1 ^ o1, $[46] ^= h0 ^ p0, $[47] ^= h1 ^ p1;
  $.fill(0, 0, 32);
};
/** Initializes the BLAKE2b state. */
export const b2b_new = (
  key?: Uint8Array,
  length = 64,
): Uint32Array<ArrayBuffer> => {
  const state = new Uint32Array(54);
  key &&= key.subarray(0, 64), state[53] = length = length >>> 0 || 1;
  state.set(B2B, 32), state[32] ^= length | key?.length! << 8 | 0x01010000;
  return key?.length && (b2b_set(state, key), state[48] = 128), state;
};
/** Processes a chunk of data and updates the BLAKE2b state. */
export const b2b_set = <A extends Uint32Array>($: A, input: Uint8Array): A => {
  for (let z = 0; z < input.length; ++z) {
    if ($[48] === 128) {
      ($[49] += 128) < Mod.U || ++$[50] < Mod.U || ++$[51] < Mod.U || ++$[52];
      b2b_mix($, $[48] = 0);
    }
    $[$[48] >> 2] |= input[z] << ($[48]++ << 3);
  }
  return $;
};
/** Finalizes the BLAKE2b state into a fixed-length hash. */
export const b2b_get = ($: Uint32Array): Uint8Array<ArrayBuffer> => {
  ($[49] += $[48]) < Mod.U || ++$[50] < Mod.U || ++$[51] < Mod.U || ++$[52];
  b2b_mix($, 1);
  const out = new Uint8Array($[53]);
  for (let z = 0; z < out.length; ++z) out[z] = $[z + 128 >> 2] >> (z << 3);
  return out;
};
/** Hashes with BLAKE2b. */
export const b2b: Hash<[$: Uint8Array, key?: Uint8Array, length?: number]> = (
  $: Uint8Array,
  key?: Uint8Array,
  length?: number,
): Uint8Array<ArrayBuffer> => b2b_get(b2b_set(b2b_new(key, length), $));
