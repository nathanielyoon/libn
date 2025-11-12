/** Hash function (with parameter names from tuple). */
export type Hash<A extends any[] = []> = (..._: A) => Uint8Array<ArrayBuffer>;
/** Parses a base16-encoded initialization vector into 32-bit words. */
export const iv = (hex: string): Uint32Array<ArrayBuffer> =>
  Uint32Array.from(hex.match(/.{8}/g)!, ($) => parseInt($, 16));
/** Parses a base16-encoded permutation table into 8-bit words. */
export const perm = (
  hex: string | string[],
  shift?: number,
): Uint8Array<ArrayBuffer> =>
  Uint8Array.from(hex, ($) => parseInt($, 16) << shift!);
