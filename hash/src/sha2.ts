import { en_iv, type Hash, min, SHA256, SHA512 } from "./common.ts";

type Mix = (block: DataView, at: number, $: Uint32Array) => void;
const STATE = new Uint32Array(16), BLOCK = new Uint8Array(128);
const BLOCK_VIEW = new DataView(BLOCK.buffer);
const md = (length: number, iv: Uint32Array, mix: Mix, $: Uint8Array) => {
  BLOCK.fill(0), STATE.set(iv);
  const size = iv.length << 3, max = $.length;
  let z = 0, y = 0;
  for (const view = new DataView($.buffer, $.byteOffset); z < max;) {
    const chunk = min(size - y, max - z);
    if (chunk !== size) BLOCK.set($.subarray(z, z += chunk)), y += chunk;
    else do mix(view, z, STATE), z += size; while (max - z >= size);
  }
  BLOCK[y] = 128, size - ++y < size >> 3 && mix(BLOCK_VIEW, y = 0, STATE);
  BLOCK.fill(0, y), BLOCK_VIEW.setBigUint64(size - 8, BigInt(max) << 3n);
  mix(BLOCK_VIEW, 0, STATE), z = length;
  do BLOCK_VIEW.setUint32(z -= 4, STATE[z >> 2]); while (z);
  return new Uint8Array(BLOCK.subarray(0, length));
};
const W64 = /* @__PURE__ */ new Uint32Array(64);
const K64 = /* @__PURE__ */ en_iv(
  "428a2f9871374491b5c0fbcfe9b5dba53956c25b59f111f1923f82a4ab1c5ed5d807aa9812835b01243185be550c7dc372be5d7480deb1fe9bdc06a7c19bf174e49b69c1efbe47860fc19dc6240ca1cc2de92c6f4a7484aa5cb0a9dc76f988da983e5152a831c66db00327c8bf597fc7c6e00bf3d5a7914706ca63511429296727b70a852e1b21384d2c6dfc53380d13650a7354766a0abb81c2c92e92722c85a2bfe8a1a81a664bc24b8b70c76c51a3d192e819d6990624f40e3585106aa07019a4c1161e376c082748774c34b0bcb5391c0cb34ed8aa4a5b9cca4f682e6ff3748f82ee78a5636f84c878148cc7020890befffaa4506cebbef9a3f7c67178f2",
);
const mix_64: Mix = (block, at, $) => {
  let a, b, z = 0;
  do W64[z] = block.getUint32(at), at += 4; while (++z < 16);
  do a = W64[z - 2],
    b = W64[z - 15],
    W64[z] = ((b >>> 7 | b << 25) ^ (b >>> 18 | b << 14) ^ b >>> 3) +
      ((a >>> 17 | a << 15) ^ (a >>> 19 | a << 13) ^ a >>> 10) +
      W64[z - 7] + W64[z - 16]; while (++z < 64);
  let c = $[z = 0], d = $[1], e = $[2], f = $[3], g = $[4], h = $[5], i = $[6];
  let j = $[7];
  do a = ((g >>> 6 | g << 26) ^ (g >>> 11 | g << 21) ^ (g >>> 25 | g << 7)) +
    (g & h ^ ~g & i) + j + K64[z] + W64[z],
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
const U80 = /* @__PURE__ */ new Uint32Array(80);
const L80 = /* @__PURE__ */ new Uint32Array(80);
const K80 = /* @__PURE__ */ en_iv(
  "428a2f9871374491b5c0fbcfe9b5dba53956c25b59f111f1923f82a4ab1c5ed5d807aa9812835b01243185be550c7dc372be5d7480deb1fe9bdc06a7c19bf174e49b69c1efbe47860fc19dc6240ca1cc2de92c6f4a7484aa5cb0a9dc76f988da983e5152a831c66db00327c8bf597fc7c6e00bf3d5a7914706ca63511429296727b70a852e1b21384d2c6dfc53380d13650a7354766a0abb81c2c92e92722c85a2bfe8a1a81a664bc24b8b70c76c51a3d192e819d6990624f40e3585106aa07019a4c1161e376c082748774c34b0bcb5391c0cb34ed8aa4a5b9cca4f682e6ff3748f82ee78a5636f84c878148cc7020890befffaa4506cebbef9a3f7c67178f2ca273eced186b8c7eada7dd6f57d4f7f06f067aa0a637dc5113f98041b710b3528db77f532caab7b3c9ebe0a431d67c44cc5d4be597f299c5fcb6fab6c44198cd728ae2223ef65cdec4d3b2f8189dbbcf348b538b605d019af194f9bda6d8118a303024245706fbe4ee4b28cd5ffb4e2f27b896f3b1696b125c71235cf6926949ef14ad2384f25e38b8cd5b577ac9c65592b02756ea6e483bd41fbd4831153b5ee66dfab2db4321098fb213fbeef0ee43da88fc2930aa725e003826f0a0e6e7046d22ffc5c26c9265ac42aed9d95b3df8baf63de3c77b2a847edaee61482353b4cf10364bc423001d0f897910654be30d6ef52185565a9105771202a32bbd1b8b8d2d0c85141ab53df8eeb99e19b48a8c5c95a63e3418acb7763e373d6b2b8a35defb2fc43172f60a1f0ab721a6439ec23631e28de82bde9b2c67915e372532bea26619c21c0c207cde0eb1eee6ed17872176fbaa2c898a6bef90dae131c471b23047d8440c7249315c9bebc9c100d4ccb3e42b6fc657e2a3ad6faec4a475817",
);
const mix_80: Mix = (block, at, $) => {
  let a, b, c, d, z = 0;
  do L80[z] = block.getUint32(at),
    U80[z] = block.getUint32(at + 4),
    at += 8; while (++z < 16);
  do a = L80[z - 15],
    b = U80[z - 15],
    c = ((b >>> 1 | a << 31) ^ (b >>> 8 | a << 24) ^ (b >>> 7 | a << 25)) >>> 0,
    d = (a >>> 1 | b << 31) ^ (a >>> 8 | b << 24) ^ a >>> 7,
    a = L80[z - 2],
    b = U80[z - 2],
    U80[z] = c += U80[z - 16] + U80[z - 7] + (((b >>> 19 | a << 13) ^
      (a >>> 29 | b << 3) ^ (b >>> 6 | a << 26)) >>> 0),
    L80[z] = d + ((a >>> 19 | b << 13) ^ (b >>> 29 | a << 3) ^ a >>> 6) +
      L80[z - 7] + L80[z - 16] + (c / 0x100000000 | 0); while (++z < 80);
  let e = $[z = 0], f = $[1], g = $[2], h = $[3], i = $[4], j = $[5];
  let k = $[6], l = $[7], m = $[8], n = $[9], o = $[10], p = $[11];
  let q = $[12], r = $[13], s = $[14], t = $[15], u, v;
  do a = (n >>> 9 | m << 23) ^ (m >>> 14 | n << 18) ^ (m >>> 18 | n << 14),
    b = (m >>> 9 | n << 23) ^ (n >>> 14 | m << 18) ^ (n >>> 18 | m << 14),
    u = t + (b >>> 0) + ((n & p ^ ~n & r) >>> 0) + K80[z + 80] + U80[z],
    v = a + s + (m & o ^ ~m & q) + K80[z] + L80[z] + (u / 0x100000000 | 0) | 0,
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
    m = v + k + (n / 0x100000000 | 0) | 0,
    k = i,
    i = g,
    g = e,
    l = j,
    j = h,
    h = f >>> 0,
    f = (b >>> 0) + (d >>> 0) + (u >>> 0),
    e = (f / 0x100000000 | 0) + a + c + v | 0; while (++z < 80);
  $[0] = $[0] + e + (($[1] += f >>> 0) / 0x100000000 | 0) | 0;
  $[2] = $[2] + g + (($[3] += h) / 0x100000000 | 0) | 0;
  $[4] = $[4] + i + (($[5] += j) / 0x100000000 | 0) | 0;
  $[6] = $[6] + k + (($[7] += l) / 0x100000000 | 0) | 0;
  $[8] = $[8] + m + (($[9] += n >>> 0) / 0x100000000 | 0) | 0;
  $[10] = $[10] + o + (($[11] += p) / 0x100000000 | 0) | 0;
  $[12] = $[12] + q + (($[13] += r) / 0x100000000 | 0) | 0;
  $[14] = $[14] + s + (($[15] += t) / 0x100000000 | 0) | 0;
};
const SHA224 = /* @__PURE__ */ en_iv(
  "c1059ed8367cd5073070dd17f70e5939ffc00b316858151164f98fa7befa4fa4",
);
const SHA384 = /* @__PURE__ */ en_iv(
  "cbbb9d5dc1059ed8629a292a367cd5079159015a3070dd17152fecd8f70e593967332667ffc00b318eb44a8768581511db0c2e0d64f98fa747b5481dbefa4fa4",
);
/** Hashes with SHA-224. */
export const sha224: Hash<[data: Uint8Array]> = /* @__PURE__ */
  md.bind(null, 28, SHA224, mix_64);
/** Hashes with SHA-256. */
export const sha256: Hash<[data: Uint8Array]> = /* @__PURE__ */
  md.bind(null, 32, SHA256, mix_64);
/** Hashes with SHA-384. */
export const sha384: Hash<[data: Uint8Array]> = /* @__PURE__ */
  md.bind(null, 48, SHA384, mix_80);
/** Hashes with SHA-512. */
export const sha512: Hash<[data: Uint8Array]> = /* @__PURE__ */
  md.bind(null, 64, SHA512, mix_80);
