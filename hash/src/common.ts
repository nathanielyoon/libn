/** Finds the minimum of two 32-bit integers. */
export const min = (a: number, b: number): number => b + (a - b & a - b >> 31);
/** Parses a base16-encoded initialization vector into 32-bit words. */
export const iv = ($: string): Uint32Array<ArrayBuffer> =>
  Uint32Array.from($.match(/.{8}/g)!, ($) => parseInt($, 16));
/** SHA-512 IV. */
export const SHA512 = /* @__PURE__ */ iv(
  "6a09e667f3bcc908bb67ae8584caa73b3c6ef372fe94f82ba54ff53a5f1d36f1510e527fade682d19b05688c2b3e6c1f1f83d9abfb41bd6b5be0cd19137e2179",
);
/** SHA-256 IV. */
export const SHA256 = /* @__PURE__ */ SHA512.filter((_, z) => z & 1 ^ 1);
