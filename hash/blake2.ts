/** @module blake2 */
import { type Hash, iv, perm } from "./lib.ts";

const STATE = /* @__PURE__ */ new Uint32Array(16);
const BLOCK = /* @__PURE__ */ new Uint8Array(128);
const VIEW = /* @__PURE__ */ (() => new DataView(BLOCK.buffer))();
const b2 = (
  initial: Uint32Array,
  mix: (t: number, final: boolean) => void,
  $: Uint8Array,
  key?: Uint8Array,
  length?: number,
) => {
  const size = initial.length << 3, max = $.length & -size;
  STATE.set(initial), key &&= key.subarray(0, size >> 1);
  length = Math.min(length! >>> 0, size >> 1) || size >> 1;
  STATE[0] ^= length | key?.length! << 8 | 0x1010000;
  let z = 0, y = 0;
  if (key?.length) BLOCK.set(key), z = size;
  for (let x = 0; x !== max; BLOCK.set($.subarray(x, x += z = size))) {
    if (z) mix(y += z, false), BLOCK.fill(z = 0);
  }
  if (max !== $.length) {
    if (z) mix(y += z, false), BLOCK.fill(z = 0);
    BLOCK.set($.subarray(max)), z = $.length - max;
  }
  mix(y + z, true);
  for (let x = 0; x < length; x += 4) VIEW.setUint32(x, STATE[x >> 2], true);
  const out = new Uint8Array(BLOCK.subarray(0, length));
  return STATE.fill(0), BLOCK.fill(0), out;
};
const B2S = /* @__PURE__ */ iv(
  "6a09e667bb67ae853c6ef372a54ff53a510e527f9b05688c1f83d9ab5be0cd19",
);
const P160 = /* @__PURE__ */ perm(
  "0123456789abcdefea489fd61c02b753b8c052fdae3671947931dcbe265a40f8905724afe1bc683d2c6a0b834d75fe19c51fed4a0763928bdb7ec13950f4862a6fe9b308c2d714a5a2847615fb9e3cd0",
  2,
);
/** Hashes with BLAKE2s. */
export const blake2s: Hash<[$: Uint8Array, key?: Uint8Array, length?: number]> =
  /* @__PURE__ */ b2.bind(null, B2S, (t, final) => {
    let a = STATE[0], b = STATE[1], c = STATE[2], d = STATE[3], e = STATE[4];
    let f = STATE[5], g = STATE[6], h = STATE[7], i = B2S[0], j = B2S[1];
    let k = B2S[2], l = B2S[3], m = B2S[4] ^ t, n = B2S[5] ^ t / 0x100000000;
    let o = B2S[6], p = B2S[7], z = 0;
    if (final) o = ~o;
    do m ^= a = a + e + VIEW.getUint32(P160[z++], true) >>> 0,
      m = m >>> 16 | m << 16,
      e ^= i = i + m >>> 0,
      e = e >>> 12 | e << 20,
      m ^= a = a + e + VIEW.getUint32(P160[z++], true) >>> 0,
      m = m >>> 8 | m << 24,
      e ^= i = i + m >>> 0,
      e = e >>> 7 | e << 25,
      n ^= b = b + f + VIEW.getUint32(P160[z++], true) >>> 0,
      n = n >>> 16 | n << 16,
      f ^= j = j + n >>> 0,
      f = f >>> 12 | f << 20,
      n ^= b = b + f + VIEW.getUint32(P160[z++], true) >>> 0,
      n = n >>> 8 | n << 24,
      f ^= j = j + n >>> 0,
      f = f >>> 7 | f << 25,
      o ^= c = c + g + VIEW.getUint32(P160[z++], true) >>> 0,
      o = o >>> 16 | o << 16,
      g ^= k = k + o >>> 0,
      g = g >>> 12 | g << 20,
      o ^= c = c + g + VIEW.getUint32(P160[z++], true) >>> 0,
      o = o >>> 8 | o << 24,
      g ^= k = k + o >>> 0,
      g = g >>> 7 | g << 25,
      p ^= d = d + h + VIEW.getUint32(P160[z++], true) >>> 0,
      p = p >>> 16 | p << 16,
      h ^= l = l + p >>> 0,
      h = h >>> 12 | h << 20,
      p ^= d = d + h + VIEW.getUint32(P160[z++], true) >>> 0,
      p = p >>> 8 | p << 24,
      h ^= l = l + p >>> 0,
      h = h >>> 7 | h << 25,
      p ^= a = a + f + VIEW.getUint32(P160[z++], true) >>> 0,
      p = p >>> 16 | p << 16,
      f ^= k = k + p >>> 0,
      f = f >>> 12 | f << 20,
      p ^= a = a + f + VIEW.getUint32(P160[z++], true) >>> 0,
      p = p >>> 8 | p << 24,
      f ^= k = k + p >>> 0,
      f = f >>> 7 | f << 25,
      m ^= b = b + g + VIEW.getUint32(P160[z++], true) >>> 0,
      m = m >>> 16 | m << 16,
      g ^= l = l + m >>> 0,
      g = g >>> 12 | g << 20,
      m ^= b = b + g + VIEW.getUint32(P160[z++], true) >>> 0,
      m = m >>> 8 | m << 24,
      g ^= l = l + m >>> 0,
      g = g >>> 7 | g << 25,
      n ^= c = c + h + VIEW.getUint32(P160[z++], true) >>> 0,
      n = n >>> 16 | n << 16,
      h ^= i = i + n >>> 0,
      h = h >>> 12 | h << 20,
      n ^= c = c + h + VIEW.getUint32(P160[z++], true) >>> 0,
      n = n >>> 8 | n << 24,
      h ^= i = i + n >>> 0,
      h = h >>> 7 | h << 25,
      o ^= d = d + e + VIEW.getUint32(P160[z++], true) >>> 0,
      o = o >>> 16 | o << 16,
      e ^= j = j + o >>> 0,
      e = e >>> 12 | e << 20,
      o ^= d = d + e + VIEW.getUint32(P160[z++], true) >>> 0,
      o = o >>> 8 | o << 24,
      e ^= j = j + o >>> 0,
      e = e >>> 7 | e << 25; while (z < 160);
    STATE[0] ^= a ^ i, STATE[1] ^= b ^ j, STATE[2] ^= c ^ k, STATE[3] ^= d ^ l;
    STATE[4] ^= e ^ m, STATE[5] ^= f ^ n, STATE[6] ^= g ^ o, STATE[7] ^= h ^ p;
  });
const B2B = /* @__PURE__ */ iv(
  "f3bcc9086a09e66784caa73bbb67ae85fe94f82b3c6ef3725f1d36f1a54ff53aade682d1510e527f2b3e6c1f9b05688cfb41bd6b1f83d9ab137e21795be0cd19",
);
const P192 = /* @__PURE__ */ perm(
  "0123456789abcdefea489fd61c02b753b8c052fdae3671947931dcbe265a40f8905724afe1bc683d2c6a0b834d75fe19c51fed4a0763928bdb7ec13950f4862a6fe9b308c2d714a5a2847615fb9e3cd00123456789abcdefea489fd61c02b753",
  3,
);
/** Hashes with BLAKE2b. */
export const blake2b: Hash<[$: Uint8Array, key?: Uint8Array, length?: number]> =
  /* @__PURE__ */ b2.bind(null, B2B, (t, final) => {
    let a0 = STATE[0], a1 = STATE[1], b0 = STATE[2], b1 = STATE[3];
    let c0 = STATE[4], c1 = STATE[5], d0 = STATE[6], d1 = STATE[7];
    let e0 = STATE[8], e1 = STATE[9], f0 = STATE[10], f1 = STATE[11];
    let g0 = STATE[12], g1 = STATE[13], h0 = STATE[14], h1 = STATE[15];
    let i0 = B2B[0], i1 = B2B[1], j0 = B2B[2], j1 = B2B[3], k0 = B2B[4];
    let k1 = B2B[5], l0 = B2B[6], l1 = B2B[7], m0 = B2B[8] ^ t;
    let m1 = B2B[9] ^ t / 0x100000000, n0 = B2B[10], n1 = B2B[11], o0 = B2B[12];
    let o1 = B2B[13], p0 = B2B[14], p1 = B2B[15], q, z = 0;
    if (final) o0 = ~o0, o1 = ~o1;
    do a0 += e0 + VIEW.getUint32(P192[z], true),
      a1 = a1 + e1 + VIEW.getUint32(P192[z++] + 4, true) +
          (a0 / 0x100000000 | 0) | 0,
      a0 >>>= 0,
      q = m0 ^ a0,
      i0 += m0 = (m1 ^ a1) >>> 0,
      m1 = q >>> 0,
      e1 ^= i1 = i1 + m1 + (i0 / 0x100000000 | 0) | 0,
      i0 >>>= 0,
      q = e0 ^ i0,
      e0 = (q >>> 24 ^ e1 << 8) >>> 0,
      e1 = (e1 >>> 24 ^ q << 8) >>> 0,
      a0 += e0 + VIEW.getUint32(P192[z], true),
      m1 ^= a1 = a1 + e1 + VIEW.getUint32(P192[z++] + 4, true) +
          (a0 / 0x100000000 | 0) | 0,
      a0 >>>= 0,
      q = m0 ^ a0,
      i0 += m0 = (q >>> 16 ^ m1 << 16) >>> 0,
      m1 = (m1 >>> 16 ^ q << 16) >>> 0,
      e1 ^= i1 = i1 + m1 + (i0 / 0x100000000 | 0) | 0,
      i0 >>>= 0,
      q = e0 ^ i0,
      e0 = (e1 >>> 31 ^ q << 1) >>> 0,
      e1 = (q >>> 31 ^ e1 << 1) >>> 0,
      b0 += f0 + VIEW.getUint32(P192[z], true),
      b1 = b1 + f1 + VIEW.getUint32(P192[z++] + 4, true) +
          (b0 / 0x100000000 | 0) | 0,
      b0 >>>= 0,
      q = n0 ^ b0,
      j0 += n0 = (n1 ^ b1) >>> 0,
      n1 = q >>> 0,
      f1 ^= j1 = j1 + n1 + (j0 / 0x100000000 | 0) | 0,
      j0 >>>= 0,
      q = f0 ^ j0,
      f0 = (q >>> 24 ^ f1 << 8) >>> 0,
      f1 = (f1 >>> 24 ^ q << 8) >>> 0,
      b0 += f0 + VIEW.getUint32(P192[z], true),
      n1 ^= b1 = b1 + f1 + VIEW.getUint32(P192[z++] + 4, true) +
          (b0 / 0x100000000 | 0) | 0,
      b0 >>>= 0,
      q = n0 ^ b0,
      j0 += n0 = (q >>> 16 ^ n1 << 16) >>> 0,
      n1 = (n1 >>> 16 ^ q << 16) >>> 0,
      f1 ^= j1 = j1 + n1 + (j0 / 0x100000000 | 0) | 0,
      j0 >>>= 0,
      q = f0 ^ j0,
      f0 = (f1 >>> 31 ^ q << 1) >>> 0,
      f1 = (q >>> 31 ^ f1 << 1) >>> 0,
      c0 += g0 + VIEW.getUint32(P192[z], true),
      c1 = c1 + g1 + VIEW.getUint32(P192[z++] + 4, true) +
          (c0 / 0x100000000 | 0) | 0,
      c0 >>>= 0,
      q = o0 ^ c0,
      k0 += o0 = (o1 ^ c1) >>> 0,
      o1 = q >>> 0,
      g1 ^= k1 = k1 + o1 + (k0 / 0x100000000 | 0) | 0,
      k0 >>>= 0,
      q = g0 ^ k0,
      g0 = (q >>> 24 ^ g1 << 8) >>> 0,
      g1 = (g1 >>> 24 ^ q << 8) >>> 0,
      c0 += g0 + VIEW.getUint32(P192[z], true),
      o1 ^= c1 = c1 + g1 + VIEW.getUint32(P192[z++] + 4, true) +
          (c0 / 0x100000000 | 0) | 0,
      c0 >>>= 0,
      q = o0 ^ c0,
      k0 += o0 = (q >>> 16 ^ o1 << 16) >>> 0,
      o1 = (o1 >>> 16 ^ q << 16) >>> 0,
      g1 ^= k1 = k1 + o1 + (k0 / 0x100000000 | 0) | 0,
      k0 >>>= 0,
      q = g0 ^ k0,
      g0 = (g1 >>> 31 ^ q << 1) >>> 0,
      g1 = (q >>> 31 ^ g1 << 1) >>> 0,
      d0 += h0 + VIEW.getUint32(P192[z], true),
      d1 = d1 + h1 + VIEW.getUint32(P192[z++] + 4, true) +
          (d0 / 0x100000000 | 0) | 0,
      d0 >>>= 0,
      q = p0 ^ d0,
      l0 += p0 = (p1 ^ d1) >>> 0,
      p1 = q >>> 0,
      h1 ^= l1 = l1 + p1 + (l0 / 0x100000000 | 0) | 0,
      l0 >>>= 0,
      q = h0 ^ l0,
      h0 = (q >>> 24 ^ h1 << 8) >>> 0,
      h1 = (h1 >>> 24 ^ q << 8) >>> 0,
      d0 += h0 + VIEW.getUint32(P192[z], true),
      p1 ^= d1 = d1 + h1 + VIEW.getUint32(P192[z++] + 4, true) +
          (d0 / 0x100000000 | 0) | 0,
      d0 >>>= 0,
      q = p0 ^ d0,
      l0 += p0 = (q >>> 16 ^ p1 << 16) >>> 0,
      p1 = (p1 >>> 16 ^ q << 16) >>> 0,
      h1 ^= l1 = l1 + p1 + (l0 / 0x100000000 | 0) | 0,
      l0 >>>= 0,
      q = h0 ^ l0,
      h0 = (h1 >>> 31 ^ q << 1) >>> 0,
      h1 = (q >>> 31 ^ h1 << 1) >>> 0,
      a0 += f0 + VIEW.getUint32(P192[z], true),
      a1 = a1 + f1 + VIEW.getUint32(P192[z++] + 4, true) +
          (a0 / 0x100000000 | 0) | 0,
      a0 >>>= 0,
      q = p0 ^ a0,
      k0 += p0 = (p1 ^ a1) >>> 0,
      p1 = q >>> 0,
      f1 ^= k1 = k1 + p1 + (k0 / 0x100000000 | 0) | 0,
      k0 >>>= 0,
      q = f0 ^ k0,
      f0 = (q >>> 24 ^ f1 << 8) >>> 0,
      f1 = (f1 >>> 24 ^ q << 8) >>> 0,
      a0 += f0 + VIEW.getUint32(P192[z], true),
      p1 ^= a1 = a1 + f1 + VIEW.getUint32(P192[z++] + 4, true) +
          (a0 / 0x100000000 | 0) | 0,
      a0 >>>= 0,
      q = p0 ^ a0,
      k0 += p0 = (q >>> 16 ^ p1 << 16) >>> 0,
      p1 = (p1 >>> 16 ^ q << 16) >>> 0,
      f1 ^= k1 = k1 + p1 + (k0 / 0x100000000 | 0) | 0,
      k0 >>>= 0,
      q = f0 ^ k0,
      f0 = (f1 >>> 31 ^ q << 1) >>> 0,
      f1 = (q >>> 31 ^ f1 << 1) >>> 0,
      b0 += g0 + VIEW.getUint32(P192[z], true),
      b1 = b1 + g1 + VIEW.getUint32(P192[z++] + 4, true) +
          (b0 / 0x100000000 | 0) | 0,
      b0 >>>= 0,
      q = m0 ^ b0,
      l0 += m0 = (m1 ^ b1) >>> 0,
      m1 = q >>> 0,
      g1 ^= l1 = l1 + m1 + (l0 / 0x100000000 | 0) | 0,
      l0 >>>= 0,
      q = g0 ^ l0,
      g0 = (q >>> 24 ^ g1 << 8) >>> 0,
      g1 = (g1 >>> 24 ^ q << 8) >>> 0,
      b0 += g0 + VIEW.getUint32(P192[z], true),
      m1 ^= b1 = b1 + g1 + VIEW.getUint32(P192[z++] + 4, true) +
          (b0 / 0x100000000 | 0) | 0,
      b0 >>>= 0,
      q = m0 ^ b0,
      l0 += m0 = (q >>> 16 ^ m1 << 16) >>> 0,
      m1 = (m1 >>> 16 ^ q << 16) >>> 0,
      g1 ^= l1 = l1 + m1 + (l0 / 0x100000000 | 0) | 0,
      l0 >>>= 0,
      q = g0 ^ l0,
      g0 = (g1 >>> 31 ^ q << 1) >>> 0,
      g1 = (q >>> 31 ^ g1 << 1) >>> 0,
      c0 += h0 + VIEW.getUint32(P192[z], true),
      c1 = c1 + h1 + VIEW.getUint32(P192[z++] + 4, true) +
          (c0 / 0x100000000 | 0) | 0,
      c0 >>>= 0,
      q = n0 ^ c0,
      i0 += n0 = (n1 ^ c1) >>> 0,
      n1 = q >>> 0,
      h1 ^= i1 = i1 + n1 + (i0 / 0x100000000 | 0) | 0,
      i0 >>>= 0,
      q = h0 ^ i0,
      h0 = (q >>> 24 ^ h1 << 8) >>> 0,
      h1 = (h1 >>> 24 ^ q << 8) >>> 0,
      c0 += h0 + VIEW.getUint32(P192[z], true),
      n1 ^= c1 = c1 + h1 + VIEW.getUint32(P192[z++] + 4, true) +
          (c0 / 0x100000000 | 0) | 0,
      c0 >>>= 0,
      q = n0 ^ c0,
      i0 += n0 = (q >>> 16 ^ n1 << 16) >>> 0,
      n1 = (n1 >>> 16 ^ q << 16) >>> 0,
      h1 ^= i1 = i1 + n1 + (i0 / 0x100000000 | 0) | 0,
      i0 >>>= 0,
      q = h0 ^ i0,
      h0 = (h1 >>> 31 ^ q << 1) >>> 0,
      h1 = (q >>> 31 ^ h1 << 1) >>> 0,
      d0 += e0 + VIEW.getUint32(P192[z], true),
      d1 = d1 + e1 + VIEW.getUint32(P192[z++] + 4, true) +
          (d0 / 0x100000000 | 0) | 0,
      d0 >>>= 0,
      q = o0 ^ d0,
      j0 += o0 = (o1 ^ d1) >>> 0,
      o1 = q >>> 0,
      e1 ^= j1 = j1 + o1 + (j0 / 0x100000000 | 0) | 0,
      j0 >>>= 0,
      q = e0 ^ j0,
      e0 = (q >>> 24 ^ e1 << 8) >>> 0,
      e1 = (e1 >>> 24 ^ q << 8) >>> 0,
      d0 += e0 + VIEW.getUint32(P192[z], true),
      o1 ^= d1 = d1 + e1 + VIEW.getUint32(P192[z++] + 4, true) +
          (d0 / 0x100000000 | 0) | 0,
      d0 >>>= 0,
      q = o0 ^ d0,
      j0 += o0 = (q >>> 16 ^ o1 << 16) >>> 0,
      o1 = (o1 >>> 16 ^ q << 16) >>> 0,
      e1 ^= j1 = j1 + o1 + (j0 / 0x100000000 | 0) | 0,
      j0 >>>= 0,
      q = e0 ^ j0,
      e0 = (e1 >>> 31 ^ q << 1) >>> 0,
      e1 = (q >>> 31 ^ e1 << 1) >>> 0; while (z < 192);
    STATE[0] ^= a0 ^ i0, STATE[1] ^= a1 ^ i1, STATE[2] ^= b0 ^ j0;
    STATE[3] ^= b1 ^ j1, STATE[4] ^= c0 ^ k0, STATE[5] ^= c1 ^ k1;
    STATE[6] ^= d0 ^ l0, STATE[7] ^= d1 ^ l1, STATE[8] ^= e0 ^ m0;
    STATE[9] ^= e1 ^ m1, STATE[10] ^= f0 ^ n0, STATE[11] ^= f1 ^ n1;
    STATE[12] ^= g0 ^ o0, STATE[13] ^= g1 ^ o1, STATE[14] ^= h0 ^ p0;
    STATE[15] ^= h1 ^ p1;
  });
