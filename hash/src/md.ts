import { HI, LO, Max, min, SHA256, SHA512 } from "./common.ts";

/** SHA-2 function. */
export type Sha2 = ($: Uint8Array) => Uint8Array<ArrayBuffer>;
const md = (
  base: Uint32Array,
  block: number,
  out: number,
  pad: number,
  mix: (use: Uint32Array, data: DataView, at: number, to: Uint32Array) => void,
  $: Uint8Array,
) => {
  const length = $.length, data = new Uint8Array(block);
  const use = new Uint32Array(block * 10 >> 3), state = new Uint32Array(base);
  let view = new DataView($.buffer, $.byteOffset), z = 0, y = 0;
  while (z < length) {
    const size = min(block - y, length - z);
    if (size !== block) data.set($.subarray(z, z += size)), y += size;
    else do mix(use, view, z, state), z += block; while (length - z >= block);
  }
  view = new DataView(data.buffer), data[y] = 128;
  block - ++y < pad && mix(use, view, y = 0, state), data.fill(0, y), y = out;
  view.setBigUint64(block - 8, BigInt(length) << 3n), mix(use, view, 0, state);
  do view.setUint32(y -= 4, state[y >> 2]); while (y);
  return new Uint8Array(data.subarray(0, out));
};
/** Hashes with SHA-256. */
export const sha256: Sha2 = /* @__PURE__ */
  md.bind(null, SHA256, 64, 32, 8, (use, data, at, to) => {
    let a, b, z = 0;
    do use[z] = data.getUint32(at), at += 4; while (++z < 16);
    do a = use[z - 2],
      b = use[z - 15],
      use[z] = ((b >>> 7 | b << 25) ^ (b >>> 18 | b << 14) ^ b >>> 3) +
        ((a >>> 17 | a << 15) ^ (a >>> 19 | a << 13) ^ a >>> 10) +
        use[z - 7] + use[z - 16]; while (++z < 64);
    let c = to[z = 0], d = to[1], e = to[2], f = to[3], g = to[4], h = to[5];
    let i = to[6], j = to[7];
    do a = ((g >>> 6 | g << 26) ^ (g >>> 11 | g << 21) ^ (g >>> 25 | g << 7)) +
      (g & h ^ ~g & i) + j + LO[z] + use[z],
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
/** Hashes with SHA-512. */
export const sha512: Sha2 = /* @__PURE__ */
  md.bind(null, SHA512, 128, 64, 16, (use, data, at, to) => {
    let a, b, c, d, z = 0;
    do use[z] = data.getUint32(at),
      use[z + 80] = data.getUint32(at + 4); while (at += 8, ++z < 16);
    do a = use[z - 15],
      b = use[z + 65],
      c = ((b >>> 1 | a << 31) ^ (b >>> 8 | a << 24) ^ (b >>> 7 | a << 25)) >>>
        0,
      d = (a >>> 1 | b << 31) ^ (a >>> 8 | b << 24) ^ a >>> 7,
      a = use[z - 2],
      b = use[z + 78],
      use[z + 80] = c += use[z + 64] + use[z + 73] + (((b >>> 19 | a << 13) ^
        (a >>> 29 | b << 3) ^ (b >>> 6 | a << 26)) >>> 0),
      use[z] = d + ((a >>> 19 | b << 13) ^ (b >>> 29 | a << 3) ^ a >>> 6) +
        use[z - 7] + use[z - 16] + (c / Max.U | 0); while (++z < 80);
    let e = to[z = 0], f = to[1], g = to[2], h = to[3], i = to[4], j = to[5];
    let k = to[6], l = to[7], m = to[8], n = to[9], o = to[10], p = to[11];
    let q = to[12], r = to[13], s = to[14], t = to[15], u, v;
    do a = (n >>> 9 | m << 23) ^ (m >>> 14 | n << 18) ^ (m >>> 18 | n << 14),
      b = (m >>> 9 | n << 23) ^ (n >>> 14 | m << 18) ^ (n >>> 18 | m << 14),
      u = t + (b >>> 0) + ((n & p ^ ~n & r) >>> 0) + HI[z] + use[z + 80],
      v = a + s + (m & o ^ ~m & q) + LO[z] + use[z] + (u / Max.U | 0) | 0,
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
      m = v + k + (n / Max.U | 0) | 0,
      k = i,
      i = g,
      g = e,
      l = j,
      j = h,
      h = f >>> 0,
      f = (b >>> 0) + (d >>> 0) + (u >>> 0),
      e = (f / Max.U | 0) + a + c + v | 0; while (++z < 80);
    to[0] = to[0] + e + ((to[1] += f >>> 0) / Max.U | 0) | 0;
    to[2] = to[2] + g + ((to[3] += h) / Max.U | 0) | 0;
    to[4] = to[4] + i + ((to[5] += j) / Max.U | 0) | 0;
    to[6] = to[6] + k + ((to[7] += l) / Max.U | 0) | 0;
    to[8] = to[8] + m + ((to[9] += n >>> 0) / Max.U | 0) | 0;
    to[10] = to[10] + o + ((to[11] += p) / Max.U | 0) | 0;
    to[12] = to[12] + q + ((to[13] += r) / Max.U | 0) | 0;
    to[14] = to[14] + s + ((to[15] += t) / Max.U | 0) | 0;
  });
