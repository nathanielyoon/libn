// [0..80]    SHA-512 constant words, lower bits. (SHA-256 uses first 64.)
// [80..160]  SHA-512 constant words, upper bits.
// [160..176] SHA-512 initial hash value.
const IV = /* @__PURE__ */ Uint32Array.from(
  /* @__PURE__ */ "428a2f9871374491b5c0fbcfe9b5dba53956c25b59f111f1923f82a4ab1c5ed5d807aa9812835b01243185be550c7dc372be5d7480deb1fe9bdc06a7c19bf174e49b69c1efbe47860fc19dc6240ca1cc2de92c6f4a7484aa5cb0a9dc76f988da983e5152a831c66db00327c8bf597fc7c6e00bf3d5a7914706ca63511429296727b70a852e1b21384d2c6dfc53380d13650a7354766a0abb81c2c92e92722c85a2bfe8a1a81a664bc24b8b70c76c51a3d192e819d6990624f40e3585106aa07019a4c1161e376c082748774c34b0bcb5391c0cb34ed8aa4a5b9cca4f682e6ff3748f82ee78a5636f84c878148cc7020890befffaa4506cebbef9a3f7c67178f2ca273eced186b8c7eada7dd6f57d4f7f06f067aa0a637dc5113f98041b710b3528db77f532caab7b3c9ebe0a431d67c44cc5d4be597f299c5fcb6fab6c44198c\
d728ae2223ef65cdec4d3b2f8189dbbcf348b538b605d019af194f9bda6d8118a303024245706fbe4ee4b28cd5ffb4e2f27b896f3b1696b125c71235cf6926949ef14ad2384f25e38b8cd5b577ac9c65592b02756ea6e483bd41fbd4831153b5ee66dfab2db4321098fb213fbeef0ee43da88fc2930aa725e003826f0a0e6e7046d22ffc5c26c9265ac42aed9d95b3df8baf63de3c77b2a847edaee61482353b4cf10364bc423001d0f897910654be30d6ef52185565a9105771202a32bbd1b8b8d2d0c85141ab53df8eeb99e19b48a8c5c95a63e3418acb7763e373d6b2b8a35defb2fc43172f60a1f0ab721a6439ec23631e28de82bde9b2c67915e372532bea26619c21c0c207cde0eb1eee6ed17872176fbaa2c898a6bef90dae131c471b23047d8440c7249315c9bebc9c100d4ccb3e42b6fc657e2a3ad6faec4a475817\
6a09e667f3bcc908bb67ae8584caa73b3c6ef372fe94f82ba54ff53a5f1d36f1510e527fade682d19b05688c2b3e6c1f1f83d9abfb41bd6b5be0cd19137e2179"
    .match(/.{8}/g)!,
  ($) => parseInt($, 16),
);
const UPPER = /* @__PURE__ */ IV.subarray(160, 176);
const LOWER = /* @__PURE__ */ UPPER.filter((_, z) => z & 1 ^ 1);
const md = (
  base: Uint32Array,
  mix: (use: Uint32Array, data: DataView, at: number, to: Uint32Array) => void,
) =>
(data: Uint8Array): Uint8Array<ArrayBuffer> => {
  const a = new Uint32Array(base), b = a.length, c = b << 3; // size in bits
  const d = new Uint32Array(b * 10), e = new Uint8Array(c), f = data.length;
  let g = new DataView(data.buffer, data.byteOffset), z = 0, y = 0;
  while (z < f) {
    const j = Math.min(c - y, f - z); // compare block size to remaining input
    if (j !== c) e.set(data.subarray(z, z += j)), y += j;
    else do mix(d, g, z, a), z += c; while (f - z >= c);
  }
  g = new DataView(e.buffer), e[y] = 128, c - ++y < b && mix(d, g, y = 0, a);
  e.fill(0, y), g.setBigUint64(c - 8, BigInt(f) << 3n), mix(d, g, y = 0, a);
  do g.setUint32(y << 2, a[y]); while (++y < b);
  return new Uint8Array(e.subarray(0, c >> 1));
};
/** Hashes with SHA-512. */
export const sha512: ReturnType<typeof md> = /* @__PURE__ */ md(
  UPPER,
  (use, data, at, to) => {
    let a, b, c, d, z = 0;
    do use[z] = data.getUint32(at),
      use[z + 80] = data.getUint32(at + 4); while (
      at += 8, ++z < 16
    );
    do (a = use[z - 15], b = use[z + 65]),
      c = ((b >>> 1 | a << 31) ^ (b >>> 8 | a << 24) ^ (b >>> 7 | a << 25)) >>>
        0,
      d = (a >>> 1 | b << 31) ^ (a >>> 8 | b << 24) ^ a >>> 7,
      (a = use[z - 2], b = use[z + 78]),
      use[z + 80] = c += use[z + 64] + use[z + 73] + (((b >>> 19 | a << 13) ^
        (a >>> 29 | b << 3) ^ (b >>> 6 | a << 26)) >>> 0),
      use[z] = d + ((a >>> 19 | b << 13) ^ (b >>> 29 | a << 3) ^ a >>> 6) +
        use[z - 7] + use[z - 16] + (c / 0x100000000 | 0); while (++z < 80);
    let e = to[z = 0], f = to[1], g = to[2], h = to[3], i = to[4], j = to[5];
    let k = to[6], l = to[7], m = to[8], n = to[9], o = to[10], p = to[11];
    let q = to[12], r = to[13], s = to[14], t = to[15], u, v;
    do a = (n >>> 9 | m << 23) ^ (m >>> 14 | n << 18) ^ (m >>> 18 | n << 14),
      b = (m >>> 9 | n << 23) ^ (n >>> 14 | m << 18) ^ (n >>> 18 | m << 14),
      u = t + (b >>> 0) + ((n & p ^ ~n & r) >>> 0) + IV[z + 80] + use[z + 80],
      v = a + s + (m & o ^ ~m & q) + IV[z] + use[z] + (u / 0x100000000 | 0) | 0,
      a = (f >>> 2 | e << 30) ^ (f >>> 7 | e << 25) ^ (e >>> 28 | f << 4),
      b = (e >>> 2 | f << 30) ^ (e >>> 7 | f << 25) ^ (f >>> 28 | e << 4),
      (c = g & i ^ g & e ^ i & e, d = f & h ^ f & j ^ h & j),
      (s = q, q = o, o = m, t = r, r = p, p = n >>> 0, n = (u >>> 0) + l),
      (m = v + k + (n / 0x100000000 | 0) | 0,
        k = i,
        i = g,
        g = e,
        l = j,
        j = h),
      (h = f >>> 0, f = (b >>> 0) + (d >>> 0) + (u >>> 0)),
      e = (f / 0x100000000 | 0) + a + c + v | 0; while (++z < 80);
    to[0] = to[0] + e + ((to[1] += f >>> 0) / 0x100000000 | 0) | 0;
    to[2] = to[2] + g + ((to[3] += h) / 0x100000000 | 0) | 0;
    to[4] = to[4] + i + ((to[5] += j) / 0x100000000 | 0) | 0;
    to[6] = to[6] + k + ((to[7] += l) / 0x100000000 | 0) | 0;
    to[8] = to[8] + m + ((to[9] += n >>> 0) / 0x100000000 | 0) | 0;
    to[10] = to[10] + o + ((to[11] += p) / 0x100000000 | 0) | 0;
    to[12] = to[12] + q + ((to[13] += r) / 0x100000000 | 0) | 0;
    to[14] = to[14] + s + ((to[15] += t) / 0x100000000 | 0) | 0;
  },
);
/** Hashes with SHA-256. */
export const sha256: ReturnType<typeof md> = /* @__PURE__ */ md(
  LOWER,
  (use, data, at, to) => {
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
      (g & h ^ ~g & i) + j + IV[z] + use[z],
      b = ((c >>> 2 | c << 30) ^ (c >>> 13 | c << 19) ^ (c >>> 22 | c << 10)) +
        (d & e ^ c & d ^ c & e),
      (j = i, i = h, h = g, g = f + a | 0),
      (f = e, e = d, d = c, c = a + b | 0); while (++z < 64);
    to[0] = to[0] + c | 0, to[1] = to[1] + d | 0, to[2] = to[2] + e | 0;
    to[3] = to[3] + f | 0, to[4] = to[4] + g | 0, to[5] = to[5] + h | 0;
    to[6] = to[6] + i | 0, to[7] = to[7] + j | 0;
  },
);
/** Creates a hash-based message authentication code. */
export const hmac = (
  key: Uint8Array,
  data: Uint8Array,
): Uint8Array<ArrayBuffer> => {
  if (key.length > 64) key = sha256(key);
  const a = key.length + 63 & ~63, b = new Uint8Array(a + data.length).fill(54);
  const c = new Uint8Array(a + 32).fill(92);
  let z = a;
  do b[--z] ^= key[z], c[z] ^= key[z]; while (z);
  return b.set(data, a), c.set(sha256(b), a), sha256(c);
};
/** Derives a key with HMAC. */
export const hkdf = (
  key: Uint8Array,
  info: Uint8Array = new Uint8Array(),
  salt: Uint8Array = new Uint8Array(32),
  out = 32,
): Uint8Array<ArrayBuffer> => {
  if (out < 1 || out > 255 << 5) return new Uint8Array();
  let a;
  if (salt.length < 32) a = new Uint8Array(32), a.set(salt), salt = a;
  const b = hmac(salt, key), c = Math.ceil(out / 32), d = info.length + 32;
  const e = new Uint8Array(d + 1), f = new Uint8Array(c << 5);
  e.set(info, 32), e[d] = 1, f.set(a = hmac(b, e.subarray(32)));
  for (let z = 1; z < c; ++z) e.set(a), ++e[d], f.set(a = hmac(b, e), z << 5);
  return new Uint8Array(f.subarray(0, out));
};
