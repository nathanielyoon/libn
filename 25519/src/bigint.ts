import { sha512 } from "@libn/hash";

/** Clears and sets bits. */
export const prune = ($: Uint8Array): Uint8Array<ArrayBuffer> => {
  const a = sha512($.subarray(0, 32));
  // Only clamp the lower half, the upper half is treated as a scalar.
  return a[0] &= 248, a[31] = a[31] & 127 | 64, a;
};
/** Encodes binary -> bigint. */
export const en_big = ($: Uint8Array): bigint => {
  const a = new DataView($.buffer, $.byteOffset);
  return a.getBigUint64(0, true) | a.getBigUint64(8, true) << 64n |
    a.getBigUint64(16, true) << 128n | a.getBigUint64(24, true) << 192n;
};
/** Decodes bigint -> binary. */
export const de_big = ($: bigint): Uint8Array<ArrayBuffer> => {
  const a = new Uint8Array(32), b = new DataView(a.buffer, a.byteOffset);
  b.setBigUint64(24, $ >> 192n, true), b.setBigUint64(16, $ >> 128n, true);
  return b.setBigUint64(8, $ >> 64n, true), b.setBigUint64(0, $, true), a;
};
