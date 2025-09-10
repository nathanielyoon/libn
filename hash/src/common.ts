export const enum Max {
  U = 0x100000000,
}
/** Finds the minimum of two 32-bit integers. */
export const min = (a: number, b: number): number => b + (a - b & a - b >> 31);
const iv = ($: string) =>
  Uint32Array.from($.match(/.{8}/g)!, ($) => parseInt($, 16));
/** SHA-512 IV. */
export const SHA512 = /* @__PURE__ */ iv(
  "6a09e667f3bcc908bb67ae8584caa73b3c6ef372fe94f82ba54ff53a5f1d36f1510e527fade682d19b05688c2b3e6c1f1f83d9abfb41bd6b5be0cd19137e2179",
);
/** SHA-256 IV. */
export const SHA256 = /* @__PURE__ */ SHA512.filter((_, z) => z & 1 ^ 1);
/** SHA-512 round constants (upper bits). */
export const HI = /* @__PURE__ */ iv(
  "d728ae2223ef65cdec4d3b2f8189dbbcf348b538b605d019af194f9bda6d8118a303024245706fbe4ee4b28cd5ffb4e2f27b896f3b1696b125c71235cf6926949ef14ad2384f25e38b8cd5b577ac9c65592b02756ea6e483bd41fbd4831153b5ee66dfab2db4321098fb213fbeef0ee43da88fc2930aa725e003826f0a0e6e7046d22ffc5c26c9265ac42aed9d95b3df8baf63de3c77b2a847edaee61482353b4cf10364bc423001d0f897910654be30d6ef52185565a9105771202a32bbd1b8b8d2d0c85141ab53df8eeb99e19b48a8c5c95a63e3418acb7763e373d6b2b8a35defb2fc43172f60a1f0ab721a6439ec23631e28de82bde9b2c67915e372532bea26619c21c0c207cde0eb1eee6ed17872176fbaa2c898a6bef90dae131c471b23047d8440c7249315c9bebc9c100d4ccb3e42b6fc657e2a3ad6faec4a475817",
);
/** SHA-512 round constants (lower bits). SHA-256 also uses the first 64. */
export const LO = /* @__PURE__ */ iv(
  "428a2f9871374491b5c0fbcfe9b5dba53956c25b59f111f1923f82a4ab1c5ed5d807aa9812835b01243185be550c7dc372be5d7480deb1fe9bdc06a7c19bf174e49b69c1efbe47860fc19dc6240ca1cc2de92c6f4a7484aa5cb0a9dc76f988da983e5152a831c66db00327c8bf597fc7c6e00bf3d5a7914706ca63511429296727b70a852e1b21384d2c6dfc53380d13650a7354766a0abb81c2c92e92722c85a2bfe8a1a81a664bc24b8b70c76c51a3d192e819d6990624f40e3585106aa07019a4c1161e376c082748774c34b0bcb5391c0cb34ed8aa4a5b9cca4f682e6ff3748f82ee78a5636f84c878148cc7020890befffaa4506cebbef9a3f7c67178f2ca273eced186b8c7eada7dd6f57d4f7f06f067aa0a637dc5113f98041b710b3528db77f532caab7b3c9ebe0a431d67c44cc5d4be597f299c5fcb6fab6c44198c",
);
/** Merkle-Damgard hash construction. */
export const md = (
  base: Uint32Array,
  block: number,
  out: number,
  pad: number,
  mix: (use: Uint32Array, data: DataView, at: number, to: Uint32Array) => void,
  $: Uint8Array,
): Uint8Array<ArrayBuffer> => {
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
