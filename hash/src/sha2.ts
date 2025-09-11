import {
  type Hash,
  KH,
  KL,
  min,
  Mod,
  SHA224,
  SHA256,
  SHA384,
  SHA512,
} from "./common.ts";

type Mix = (block: DataView, at: number, $: Uint32Array) => void;
const md = (base: Uint32Array, length: number, mix: Mix, $: Uint8Array) => {
  const size = base.length << 3, max = $.length, block = new Uint8Array(size);
  const state = new Uint32Array(base);
  let view = new DataView($.buffer, $.byteOffset), z = 0, y = 0;
  while (z < max) {
    const chunk = min(size - y, max - z);
    if (chunk !== size) block.set($.subarray(z, z += chunk)), y += chunk;
    else do mix(view, z, state), z += size; while (max - z >= size);
  }
  view = new DataView(block.buffer), block[y] = 128, z = length;
  size - ++y < z >> 2 && mix(view, y = 0, state), block.fill(0, y);
  view.setBigUint64(size - 8, BigInt(max) << 3n), mix(view, 0, state);
  do view.setUint32(z -= 4, state[z >> 2]); while (z);
  return new Uint8Array(block.subarray(0, length));
};
const TEMP_64 = new Uint32Array(64);
const mix_64: Mix = (block, at, $) => {
  let a, b, z = 0;
  do TEMP_64[z] = block.getUint32(at), at += 4; while (++z < 16);
  do a = TEMP_64[z - 2],
    b = TEMP_64[z - 15],
    TEMP_64[z] = ((b >>> 7 | b << 25) ^ (b >>> 18 | b << 14) ^ b >>> 3) +
      ((a >>> 17 | a << 15) ^ (a >>> 19 | a << 13) ^ a >>> 10) +
      TEMP_64[z - 7] + TEMP_64[z - 16]; while (++z < 64);
  let c = $[z = 0], d = $[1], e = $[2], f = $[3], g = $[4], h = $[5], i = $[6];
  let j = $[7];
  do a = ((g >>> 6 | g << 26) ^ (g >>> 11 | g << 21) ^ (g >>> 25 | g << 7)) +
    (g & h ^ ~g & i) + j + KL[z] + TEMP_64[z],
    b = ((c >>> 2 | c << 30) ^ (c >>> 13 | c << 19) ^ (c >>> 22 | c << 10)) +
      (d & e ^ c & d ^ c & e),
    j = i,
    i = h,
    h = g,
    g = f + a | 0,
    f = e,
    e = d,
    d = c,
    c = a + b | 0; while (++z < 64);
  $[0] = $[0] + c | 0, $[1] = $[1] + d | 0, $[2] = $[2] + e | 0;
  $[3] = $[3] + f | 0, $[4] = $[4] + g | 0, $[5] = $[5] + h | 0;
  $[6] = $[6] + i | 0, $[7] = $[7] + j | 0;
};
const HI = new Uint32Array(80), LO = new Uint32Array(80);
const mix_80: Mix = (block, at, $) => {
  let a, b, c, d, z = 0;
  do LO[z] = block.getUint32(at),
    HI[z] = block.getUint32(at + 4),
    at += 8; while (++z < 16);
  do a = LO[z - 15],
    b = HI[z - 15],
    c = ((b >>> 1 | a << 31) ^ (b >>> 8 | a << 24) ^ (b >>> 7 | a << 25)) >>> 0,
    d = (a >>> 1 | b << 31) ^ (a >>> 8 | b << 24) ^ a >>> 7,
    a = LO[z - 2],
    b = HI[z - 2],
    HI[z] = c += HI[z - 16] + HI[z - 7] + (((b >>> 19 | a << 13) ^
      (a >>> 29 | b << 3) ^ (b >>> 6 | a << 26)) >>> 0),
    LO[z] = d + ((a >>> 19 | b << 13) ^ (b >>> 29 | a << 3) ^ a >>> 6) +
      LO[z - 7] + LO[z - 16] + (c / Mod.U | 0); while (++z < 80);
  let e = $[z = 0], f = $[1], g = $[2], h = $[3], i = $[4], j = $[5];
  let k = $[6], l = $[7], m = $[8], n = $[9], o = $[10], p = $[11];
  let q = $[12], r = $[13], s = $[14], t = $[15], u, v;
  do a = (n >>> 9 | m << 23) ^ (m >>> 14 | n << 18) ^ (m >>> 18 | n << 14),
    b = (m >>> 9 | n << 23) ^ (n >>> 14 | m << 18) ^ (n >>> 18 | m << 14),
    u = t + (b >>> 0) + ((n & p ^ ~n & r) >>> 0) + KH[z] + HI[z],
    v = a + s + (m & o ^ ~m & q) + KL[z] + LO[z] + (u / Mod.U | 0) | 0,
    a = (f >>> 2 | e << 30) ^ (f >>> 7 | e << 25) ^ (e >>> 28 | f << 4),
    b = (e >>> 2 | f << 30) ^ (e >>> 7 | f << 25) ^ (f >>> 28 | e << 4),
    c = g & i ^ g & e ^ i & e,
    d = f & h ^ f & j ^ h & j,
    s = q,
    q = o,
    o = m,
    t = r,
    r = p,
    p = n >>> 0,
    n = (u >>> 0) + l,
    m = v + k + (n / Mod.U | 0) | 0,
    k = i,
    i = g,
    g = e,
    l = j,
    j = h,
    h = f >>> 0,
    f = (b >>> 0) + (d >>> 0) + (u >>> 0),
    e = (f / Mod.U | 0) + a + c + v | 0; while (++z < 80);
  $[0] = $[0] + e + (($[1] += f >>> 0) / Mod.U | 0) | 0;
  $[2] = $[2] + g + (($[3] += h) / Mod.U | 0) | 0;
  $[4] = $[4] + i + (($[5] += j) / Mod.U | 0) | 0;
  $[6] = $[6] + k + (($[7] += l) / Mod.U | 0) | 0;
  $[8] = $[8] + m + (($[9] += n >>> 0) / Mod.U | 0) | 0;
  $[10] = $[10] + o + (($[11] += p) / Mod.U | 0) | 0;
  $[12] = $[12] + q + (($[13] += r) / Mod.U | 0) | 0;
  $[14] = $[14] + s + (($[15] += t) / Mod.U | 0) | 0;
};
export const sha224: Hash<[$: Uint8Array]> = /* @__PURE__ */
  md.bind(null, SHA224, 28, mix_64);
/** Hashes with SHA-256. */
export const sha256: Hash<[$: Uint8Array]> = /* @__PURE__ */
  md.bind(null, SHA256, 32, mix_64);
/** Hashes with SHA-384. */
export const sha384: Hash<[$: Uint8Array]> = /* @__PURE__ */
  md.bind(null, SHA384, 48, mix_80);
/** Hashes with SHA-512. */
export const sha512: Hash<[$: Uint8Array]> = /* @__PURE__ */
  md.bind(null, SHA512, 64, mix_80);
