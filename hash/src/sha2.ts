import { BE, type Hash, HI, LO, min, Mod, UP } from "./common.ts";

const md = (
  base: Uint32Array,
  mix: (block: DataView, at: number, to: Uint32Array) => void,
  $: Uint8Array,
) => {
  const size = base.length << 3, length = $.length;
  const block = new Uint8Array(size), state = new Uint32Array(base);
  let view = new DataView($.buffer, $.byteOffset), z = 0, y = 0;
  while (z < length) {
    const chunk = min(size - y, length - z);
    if (chunk !== size) block.set($.subarray(z, z += chunk)), y += chunk;
    else do mix(view, z, state), z += size; while (length - z >= size);
  }
  view = new DataView(block.buffer), block[y] = 128, z = size >> 1;
  size - ++y < z >> 2 && mix(view, y = 0, state), block.fill(0, y);
  view.setBigUint64(size - 8, BigInt(length) << 3n), mix(view, 0, state);
  do view.setUint32(z -= 4, state[z >> 2]); while (z);
  return new Uint8Array(block.subarray(0, size >> 1));
};
const SHA256 = new Uint32Array(64);
/** Hashes with SHA-256. */
export const sha256: Hash<[$: Uint8Array]> = /* @__PURE__ */
  md.bind(null, UP, (block, at, to) => {
    let a, b, z = 0;
    do SHA256[z] = block.getUint32(at), at += 4; while (++z < 16);
    do a = SHA256[z - 2],
      b = SHA256[z - 15],
      SHA256[z] = ((b >>> 7 | b << 25) ^ (b >>> 18 | b << 14) ^ b >>> 3) +
        ((a >>> 17 | a << 15) ^ (a >>> 19 | a << 13) ^ a >>> 10) +
        SHA256[z - 7] + SHA256[z - 16]; while (++z < 64);
    let c = to[z = 0], d = to[1], e = to[2], f = to[3], g = to[4], h = to[5];
    let i = to[6], j = to[7];
    do a = ((g >>> 6 | g << 26) ^ (g >>> 11 | g << 21) ^ (g >>> 25 | g << 7)) +
      (g & h ^ ~g & i) + j + LO[z] + SHA256[z],
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
    to[0] = to[0] + c | 0, to[1] = to[1] + d | 0, to[2] = to[2] + e | 0;
    to[3] = to[3] + f | 0, to[4] = to[4] + g | 0, to[5] = to[5] + h | 0;
    to[6] = to[6] + i | 0, to[7] = to[7] + j | 0;
  });
const LOWER = new Uint32Array(80), UPPER = new Uint32Array(80);
/** Hashes with SHA-512. */
export const sha512: Hash<[$: Uint8Array]> = /* @__PURE__ */
  md.bind(null, BE, (block, at, to) => {
    let a, b, c, d, z = 0;
    do LOWER[z] = block.getUint32(at),
      UPPER[z] = block.getUint32(at + 4); while (at += 8, ++z < 16);
    do a = LOWER[z - 15],
      b = UPPER[z - 15],
      c = ((b >>> 1 | a << 31) ^ (b >>> 8 | a << 24) ^ (b >>> 7 | a << 25)) >>>
        0,
      d = (a >>> 1 | b << 31) ^ (a >>> 8 | b << 24) ^ a >>> 7,
      a = LOWER[z - 2],
      b = UPPER[z - 2],
      UPPER[z + 0] = c += UPPER[z - 16] + UPPER[z - 7] +
        (((b >>> 19 | a << 13) ^ (a >>> 29 | b << 3) ^ (b >>> 6 | a << 26)) >>>
          0),
      LOWER[z] = d + ((a >>> 19 | b << 13) ^ (b >>> 29 | a << 3) ^ a >>> 6) +
        LOWER[z - 7] + LOWER[z - 16] + (c / Mod.U | 0); while (++z < 80);
    let e = to[z = 0], f = to[1], g = to[2], h = to[3], i = to[4], j = to[5];
    let k = to[6], l = to[7], m = to[8], n = to[9], o = to[10], p = to[11];
    let q = to[12], r = to[13], s = to[14], t = to[15], u, v;
    do a = (n >>> 9 | m << 23) ^ (m >>> 14 | n << 18) ^ (m >>> 18 | n << 14),
      b = (m >>> 9 | n << 23) ^ (n >>> 14 | m << 18) ^ (n >>> 18 | m << 14),
      u = t + (b >>> 0) + ((n & p ^ ~n & r) >>> 0) + HI[z] + UPPER[z],
      v = a + s + (m & o ^ ~m & q) + LO[z] + LOWER[z] + (u / Mod.U | 0) | 0,
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
    to[0] = to[0] + e + ((to[1] += f >>> 0) / Mod.U | 0) | 0;
    to[2] = to[2] + g + ((to[3] += h) / Mod.U | 0) | 0;
    to[4] = to[4] + i + ((to[5] += j) / Mod.U | 0) | 0;
    to[6] = to[6] + k + ((to[7] += l) / Mod.U | 0) | 0;
    to[8] = to[8] + m + ((to[9] += n >>> 0) / Mod.U | 0) | 0;
    to[10] = to[10] + o + ((to[11] += p) / Mod.U | 0) | 0;
    to[12] = to[12] + q + ((to[13] += r) / Mod.U | 0) | 0;
    to[14] = to[14] + s + ((to[15] += t) / Mod.U | 0) | 0;
  });
