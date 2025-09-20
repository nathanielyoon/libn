import { type Hash, SHA256, SHA512 } from "./common.ts";

// Byte counter, message block, hash state, offset counter, output length.
type B2State = Uint32Array<ArrayBuffer>;
const PERMUTE = /* @__PURE__ */ Uint8Array.from(
  "0123456789abcdefea489fd61c02b753b8c052fdae3671947931dcbe265a40f8905724afe1bc683d2c6a0b834d75fe19c51fed4a0763928bdb7ec13950f4862a6fe9b308c2d714a5a2847615fb9e3cd00123456789abcdefea489fd61c02b753",
  // Since the state buffer's first word stores the current block's length, this
  // table's indices start at 1.
  ($) => parseInt($, 16) + 1,
);
const b2s_add = ($: B2State) => ($[25] += $[0]) < 0x100000000 || ++$[26];
const b2s_mix = ($: B2State, final: boolean) => {
  let a = $[17], b = $[18], c = $[19], d = $[20], e = $[21], f = $[22];
  let g = $[23], h = $[24], i = SHA256[0], j = SHA256[1], k = SHA256[2];
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
  $[17] ^= a ^ i, $[18] ^= b ^ j, $[19] ^= c ^ k, $[20] ^= d ^ l;
  $[21] ^= e ^ m, $[22] ^= f ^ n, $[23] ^= g ^ o, $[24] ^= h ^ p;
  $.fill(0, 0, 17);
};
const b2b_add = ($: B2State) =>
  ($[49] += $[0]) < 0x100000000 ||
  ++$[50] === 0x100000000 && ++$[51] === 0x100000000 && ++$[52];
// Each BLAKE2b word is split into two 32-bit halves, so given the 1-word offset
// we really want `index * 2 - 1` and `index * 2`.
const PERMUTE_BOTH = /* @__PURE__ */ PERMUTE.map(($) => $ << 1);
// The BLAKE2b IV is SHA-512's but little-endian, so this swaps each 64-bit
// word's constituent 32-bit halves.
const B2B = /* @__PURE__ */ SHA512.map((_, z, $) => $[z ^ 1]);
const b2b_mix = ($: B2State, final: boolean) => {
  let a0 = $[33], a1 = $[34], b0 = $[35], b1 = $[36], c0 = $[37], c1 = $[38];
  let d0 = $[39], d1 = $[40], e0 = $[41], e1 = $[42], f0 = $[43], f1 = $[44];
  let g0 = $[45], g1 = $[46], h0 = $[47], h1 = $[48], i0 = B2B[0], i1 = B2B[1];
  let j0 = B2B[2], j1 = B2B[3], k0 = B2B[4], k1 = B2B[5], l0 = B2B[6];
  let l1 = B2B[7], m0 = B2B[8] ^ $[49], m1 = B2B[9] ^ $[50];
  let n0 = B2B[10] ^ $[51], n1 = B2B[11] ^ $[52], o0 = B2B[12], o1 = B2B[13];
  let p0 = B2B[14], p1 = B2B[15], q, z = 0;
  if (final) o0 = ~o0, o1 = ~o1;
  do a0 += e0 + $[PERMUTE_BOTH[z] - 1],
    a1 = a1 + e1 + $[PERMUTE_BOTH[z++]] + (a0 / 0x100000000 | 0) | 0,
    a0 >>>= 0,
    q = m0 ^ a0,
    i0 += m0 = (m1 ^ a1) >>> 0,
    m1 = q >>> 0,
    e1 ^= i1 = i1 + m1 + (i0 / 0x100000000 | 0) | 0,
    i0 >>>= 0,
    q = e0 ^ i0,
    e0 = (q >>> 24 ^ e1 << 8) >>> 0,
    e1 = (e1 >>> 24 ^ q << 8) >>> 0,
    a0 += e0 + $[PERMUTE_BOTH[z] - 1],
    m1 ^= a1 = a1 + e1 + $[PERMUTE_BOTH[z++]] + (a0 / 0x100000000 | 0) | 0,
    a0 >>>= 0,
    q = m0 ^ a0,
    i0 += m0 = (q >>> 16 ^ m1 << 16) >>> 0,
    m1 = (m1 >>> 16 ^ q << 16) >>> 0,
    e1 ^= i1 = i1 + m1 + (i0 / 0x100000000 | 0) | 0,
    i0 >>>= 0,
    q = e0 ^ i0,
    e0 = (e1 >>> 31 ^ q << 1) >>> 0,
    e1 = (q >>> 31 ^ e1 << 1) >>> 0,
    b0 += f0 + $[PERMUTE_BOTH[z] - 1],
    b1 = b1 + f1 + $[PERMUTE_BOTH[z++]] + (b0 / 0x100000000 | 0) | 0,
    b0 >>>= 0,
    q = n0 ^ b0,
    j0 += n0 = (n1 ^ b1) >>> 0,
    n1 = q >>> 0,
    f1 ^= j1 = j1 + n1 + (j0 / 0x100000000 | 0) | 0,
    j0 >>>= 0,
    q = f0 ^ j0,
    f0 = (q >>> 24 ^ f1 << 8) >>> 0,
    f1 = (f1 >>> 24 ^ q << 8) >>> 0,
    b0 += f0 + $[PERMUTE_BOTH[z] - 1],
    n1 ^= b1 = b1 + f1 + $[PERMUTE_BOTH[z++]] + (b0 / 0x100000000 | 0) | 0,
    b0 >>>= 0,
    q = n0 ^ b0,
    j0 += n0 = (q >>> 16 ^ n1 << 16) >>> 0,
    n1 = (n1 >>> 16 ^ q << 16) >>> 0,
    f1 ^= j1 = j1 + n1 + (j0 / 0x100000000 | 0) | 0,
    j0 >>>= 0,
    q = f0 ^ j0,
    f0 = (f1 >>> 31 ^ q << 1) >>> 0,
    f1 = (q >>> 31 ^ f1 << 1) >>> 0,
    c0 += g0 + $[PERMUTE_BOTH[z] - 1],
    c1 = c1 + g1 + $[PERMUTE_BOTH[z++]] + (c0 / 0x100000000 | 0) | 0,
    c0 >>>= 0,
    q = o0 ^ c0,
    k0 += o0 = (o1 ^ c1) >>> 0,
    o1 = q >>> 0,
    g1 ^= k1 = k1 + o1 + (k0 / 0x100000000 | 0) | 0,
    k0 >>>= 0,
    q = g0 ^ k0,
    g0 = (q >>> 24 ^ g1 << 8) >>> 0,
    g1 = (g1 >>> 24 ^ q << 8) >>> 0,
    c0 += g0 + $[PERMUTE_BOTH[z] - 1],
    o1 ^= c1 = c1 + g1 + $[PERMUTE_BOTH[z++]] + (c0 / 0x100000000 | 0) | 0,
    c0 >>>= 0,
    q = o0 ^ c0,
    k0 += o0 = (q >>> 16 ^ o1 << 16) >>> 0,
    o1 = (o1 >>> 16 ^ q << 16) >>> 0,
    g1 ^= k1 = k1 + o1 + (k0 / 0x100000000 | 0) | 0,
    k0 >>>= 0,
    q = g0 ^ k0,
    g0 = (g1 >>> 31 ^ q << 1) >>> 0,
    g1 = (q >>> 31 ^ g1 << 1) >>> 0,
    d0 += h0 + $[PERMUTE_BOTH[z] - 1],
    d1 = d1 + h1 + $[PERMUTE_BOTH[z++]] + (d0 / 0x100000000 | 0) | 0,
    d0 >>>= 0,
    q = p0 ^ d0,
    l0 += p0 = (p1 ^ d1) >>> 0,
    p1 = q >>> 0,
    h1 ^= l1 = l1 + p1 + (l0 / 0x100000000 | 0) | 0,
    l0 >>>= 0,
    q = h0 ^ l0,
    h0 = (q >>> 24 ^ h1 << 8) >>> 0,
    h1 = (h1 >>> 24 ^ q << 8) >>> 0,
    d0 += h0 + $[PERMUTE_BOTH[z] - 1],
    p1 ^= d1 = d1 + h1 + $[PERMUTE_BOTH[z++]] + (d0 / 0x100000000 | 0) | 0,
    d0 >>>= 0,
    q = p0 ^ d0,
    l0 += p0 = (q >>> 16 ^ p1 << 16) >>> 0,
    p1 = (p1 >>> 16 ^ q << 16) >>> 0,
    h1 ^= l1 = l1 + p1 + (l0 / 0x100000000 | 0) | 0,
    l0 >>>= 0,
    q = h0 ^ l0,
    h0 = (h1 >>> 31 ^ q << 1) >>> 0,
    h1 = (q >>> 31 ^ h1 << 1) >>> 0,
    a0 += f0 + $[PERMUTE_BOTH[z] - 1],
    a1 = a1 + f1 + $[PERMUTE_BOTH[z++]] + (a0 / 0x100000000 | 0) | 0,
    a0 >>>= 0,
    q = p0 ^ a0,
    k0 += p0 = (p1 ^ a1) >>> 0,
    p1 = q >>> 0,
    f1 ^= k1 = k1 + p1 + (k0 / 0x100000000 | 0) | 0,
    k0 >>>= 0,
    q = f0 ^ k0,
    f0 = (q >>> 24 ^ f1 << 8) >>> 0,
    f1 = (f1 >>> 24 ^ q << 8) >>> 0,
    a0 += f0 + $[PERMUTE_BOTH[z] - 1],
    p1 ^= a1 = a1 + f1 + $[PERMUTE_BOTH[z++]] + (a0 / 0x100000000 | 0) | 0,
    a0 >>>= 0,
    q = p0 ^ a0,
    k0 += p0 = (q >>> 16 ^ p1 << 16) >>> 0,
    p1 = (p1 >>> 16 ^ q << 16) >>> 0,
    f1 ^= k1 = k1 + p1 + (k0 / 0x100000000 | 0) | 0,
    k0 >>>= 0,
    q = f0 ^ k0,
    f0 = (f1 >>> 31 ^ q << 1) >>> 0,
    f1 = (q >>> 31 ^ f1 << 1) >>> 0,
    b0 += g0 + $[PERMUTE_BOTH[z] - 1],
    b1 = b1 + g1 + $[PERMUTE_BOTH[z++]] + (b0 / 0x100000000 | 0) | 0,
    b0 >>>= 0,
    q = m0 ^ b0,
    l0 += m0 = (m1 ^ b1) >>> 0,
    m1 = q >>> 0,
    g1 ^= l1 = l1 + m1 + (l0 / 0x100000000 | 0) | 0,
    l0 >>>= 0,
    q = g0 ^ l0,
    g0 = (q >>> 24 ^ g1 << 8) >>> 0,
    g1 = (g1 >>> 24 ^ q << 8) >>> 0,
    b0 += g0 + $[PERMUTE_BOTH[z] - 1],
    m1 ^= b1 = b1 + g1 + $[PERMUTE_BOTH[z++]] + (b0 / 0x100000000 | 0) | 0,
    b0 >>>= 0,
    q = m0 ^ b0,
    l0 += m0 = (q >>> 16 ^ m1 << 16) >>> 0,
    m1 = (m1 >>> 16 ^ q << 16) >>> 0,
    g1 ^= l1 = l1 + m1 + (l0 / 0x100000000 | 0) | 0,
    l0 >>>= 0,
    q = g0 ^ l0,
    g0 = (g1 >>> 31 ^ q << 1) >>> 0,
    g1 = (q >>> 31 ^ g1 << 1) >>> 0,
    c0 += h0 + $[PERMUTE_BOTH[z] - 1],
    c1 = c1 + h1 + $[PERMUTE_BOTH[z++]] + (c0 / 0x100000000 | 0) | 0,
    c0 >>>= 0,
    q = n0 ^ c0,
    i0 += n0 = (n1 ^ c1) >>> 0,
    n1 = q >>> 0,
    h1 ^= i1 = i1 + n1 + (i0 / 0x100000000 | 0) | 0,
    i0 >>>= 0,
    q = h0 ^ i0,
    h0 = (q >>> 24 ^ h1 << 8) >>> 0,
    h1 = (h1 >>> 24 ^ q << 8) >>> 0,
    c0 += h0 + $[PERMUTE_BOTH[z] - 1],
    n1 ^= c1 = c1 + h1 + $[PERMUTE_BOTH[z++]] + (c0 / 0x100000000 | 0) | 0,
    c0 >>>= 0,
    q = n0 ^ c0,
    i0 += n0 = (q >>> 16 ^ n1 << 16) >>> 0,
    n1 = (n1 >>> 16 ^ q << 16) >>> 0,
    h1 ^= i1 = i1 + n1 + (i0 / 0x100000000 | 0) | 0,
    i0 >>>= 0,
    q = h0 ^ i0,
    h0 = (h1 >>> 31 ^ q << 1) >>> 0,
    h1 = (q >>> 31 ^ h1 << 1) >>> 0,
    d0 += e0 + $[PERMUTE_BOTH[z] - 1],
    d1 = d1 + e1 + $[PERMUTE_BOTH[z++]] + (d0 / 0x100000000 | 0) | 0,
    d0 >>>= 0,
    q = o0 ^ d0,
    j0 += o0 = (o1 ^ d1) >>> 0,
    o1 = q >>> 0,
    e1 ^= j1 = j1 + o1 + (j0 / 0x100000000 | 0) | 0,
    j0 >>>= 0,
    q = e0 ^ j0,
    e0 = (q >>> 24 ^ e1 << 8) >>> 0,
    e1 = (e1 >>> 24 ^ q << 8) >>> 0,
    d0 += e0 + $[PERMUTE_BOTH[z] - 1],
    o1 ^= d1 = d1 + e1 + $[PERMUTE_BOTH[z++]] + (d0 / 0x100000000 | 0) | 0,
    d0 >>>= 0,
    q = o0 ^ d0,
    j0 += o0 = (q >>> 16 ^ o1 << 16) >>> 0,
    o1 = (o1 >>> 16 ^ q << 16) >>> 0,
    e1 ^= j1 = j1 + o1 + (j0 / 0x100000000 | 0) | 0,
    j0 >>>= 0,
    q = e0 ^ j0,
    e0 = (e1 >>> 31 ^ q << 1) >>> 0,
    e1 = (q >>> 31 ^ e1 << 1) >>> 0; while (z < 192);
  $[33] ^= a0 ^ i0, $[34] ^= a1 ^ i1, $[35] ^= b0 ^ j0, $[36] ^= b1 ^ j1;
  $[37] ^= c0 ^ k0, $[38] ^= c1 ^ k1, $[39] ^= d0 ^ l0, $[40] ^= d1 ^ l1;
  $[41] ^= e0 ^ m0, $[42] ^= e1 ^ m1, $[43] ^= f0 ^ n0, $[44] ^= f1 ^ n1;
  $[45] ^= g0 ^ o0, $[46] ^= g1 ^ o1, $[47] ^= h0 ^ p0, $[48] ^= h1 ^ p1;
  $.fill(0, 0, 33);
};
const b2_update = (
  block: number,
  add: ($: B2State) => void,
  mix: ($: B2State, final: boolean) => void,
  $: B2State,
  input: Uint8Array,
) => {
  for (let z = 0; z < input.length; ++z) {
    if ($[0] === block) add($), mix($, false);
    $[($[0] >> 2) + 1] |= input[z] << ($[0]++ << 3);
  }
  return $;
};
const b2_create = (
  max: number,
  iv: Uint32Array,
  update: ($: B2State, input: Uint8Array) => B2State,
  key?: Uint8Array,
  length?: number,
) => {
  const state = new Uint32Array((max >> 1 | max >> 2 | max >> 4) + 2);
  state.set(iv, (max >> 1) + 1), key &&= key.subarray(0, max);
  state[state.length - 1] = length = Math.min((length ?? max) >>> 0 || 1, max);
  state[(max >> 1) + 1] ^= length | key?.length! << 8 | 0x01010000;
  if (key?.length) update(state, key), state[0] = max << 1;
  return state;
};
const b2_digest = (
  start: number,
  add: ($: B2State) => void,
  mix: ($: B2State, final: boolean) => void,
  $: B2State,
) => {
  add($), mix($, true);
  const out = new Uint8Array($[$.length - 1]);
  for (let z = 0; z < out.length; ++z) out[z] = $[z + start >> 2] >> (z << 3);
  return out;
};
const b2 = (
  create: (key?: Uint8Array, length?: number) => B2State,
  update: ($: B2State, input: Uint8Array) => B2State,
  digest: ($: B2State) => Uint8Array<ArrayBuffer>,
  $: Uint8Array,
  key?: Uint8Array,
  length?: number,
) => digest(update(create(key, length), $));
/** Processes a chunk of data and updates the BLAKE2s state. */
export const b2s_update: ($: B2State, input: Uint8Array) => B2State =
  /* @__PURE__ */ b2_update.bind(null, 64, b2s_add, b2s_mix);
/** Initializes the BLAKE2s state. */
export const b2s_create: (key?: Uint8Array, length?: number) => B2State =
  /* @__PURE__ */ b2_create.bind(null, 32, SHA256, b2s_update);
/** Finalizes the BLAKE2s state into a fixed-length hash. */
export const b2s_digest: ($: B2State) => Uint8Array<ArrayBuffer> =
  /* @__PURE__ */ b2_digest.bind(null, 68, b2s_add, b2s_mix);
/** Hashes with BLAKE2s. */
export const b2s: Hash<[data: Uint8Array, key?: Uint8Array, length?: number]> =
  /* @__PURE__ */ b2.bind(null, b2s_create, b2s_update, b2s_digest);
/** Processes a chunk of data and updates the BLAKE2b state. */
export const b2b_update: ($: B2State, input: Uint8Array) => B2State =
  /* @__PURE__ */ b2_update.bind(null, 128, b2b_add, b2b_mix);
/** Initializes the BLAKE2b state. */
export const b2b_create: (key?: Uint8Array, length?: number) => B2State =
  /* @__PURE__ */ b2_create.bind(null, 64, B2B, b2b_update);
/** Finalizes the BLAKE2b state into a fixed-length hash. */
export const b2b_digest: ($: B2State) => Uint8Array<ArrayBuffer> =
  /* @__PURE__ */ b2_digest.bind(null, 132, b2b_add, b2b_mix);
/** Hashes with BLAKE2b. */
export const b2b: Hash<[data: Uint8Array, key?: Uint8Array, length?: number]> =
  /* @__PURE__ */ b2.bind(null, b2b_create, b2b_update, b2b_digest);
