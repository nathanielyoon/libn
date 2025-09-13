/** Hash function. */
export type Hash<A extends any[]> = (..._: A) => Uint8Array<ArrayBuffer>;
/** Modulus for 32-bit unsigned integers. */
export const enum Mod {
  U = 0x100000000,
}
/** Finds the minimum of two 32-bit integers. */
export const min = (a: number, b: number): number => b + (a - b & a - b >> 31);
/** Parses a base16-encoded initialization vector into 32-bit words. */
export const en_iv = ($: string): Uint32Array<ArrayBuffer> =>
  Uint32Array.from($.match(/.{8}/g)!, ($) => parseInt($, 16));
/** SHA-256 initialization vector. */
export const SHA256: Uint32Array<ArrayBuffer> = /* @__PURE__ */ en_iv(
  "6a09e667bb67ae853c6ef372a54ff53a510e527f9b05688c1f83d9ab5be0cd19",
);
/** SHA-512 initialization vector. */
export const SHA512: Uint32Array<ArrayBuffer> = /* @__PURE__ */ en_iv(
  "6a09e667f3bcc908bb67ae8584caa73b3c6ef372fe94f82ba54ff53a5f1d36f1510e527fade682d19b05688c2b3e6c1f1f83d9abfb41bd6b5be0cd19137e2179",
);
