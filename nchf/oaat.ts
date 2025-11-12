/** @module */
/** Hashes to a 32-bit unsigned integer with GoodOAAT. */
export const oaat32 = ($: Uint8Array, seed = 0): number => {
  let h1 = seed ^ 0x3b00, h2 = seed << 15 | seed >>> 17, z = 0;
  while (z < $.length) {
    h2 += h1 = (h1 + $[z++]) * 9 | 0, h2 = (h2 << 7 | h2 >>> 25) * 5 | 0;
  }
  h2 ^= h1 = (h1 ^ h2) + (h2 << 14 | h2 >>> 18);
  h1 ^= h2 += h1 >>> 6 | h1 << 26, h2 ^= h1 += h2 << 5 | h2 >>> 27;
  return h2 += h1 >>> 8 | h1 << 24, h2 >>> 0;
};
