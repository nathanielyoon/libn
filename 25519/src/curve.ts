import { sha512 } from "@libn/hash";

/** Curve25519 prime. */
export const P = (1n << 255n) - 19n;
/** Reduces modulo P. */
export const p = ($: bigint): bigint => ($ %= P) < 0n ? $ + P : $;
/** Raises to a power modulo P. */
export const s = (base: bigint, power: number, multiplier = base): bigint => {
  do base = base * base % P; while (--power); // break up exponentiation by % P
  return base * multiplier % P;
};
/** Inverts modulo P. */
export const v = ($: bigint): bigint => {
  let a = 0n, b = p($), c = P, d = 1n, e = 0n, f, g;
  while (f = b) b = c % f, c /= f, g = a - c * d, a = d, d = g, e *= ~c, c = f;
  return p(a);
};
/** Common exponentiation. */
export const r = (base: bigint, cube = base ** 3n): bigint => {
  const a = s(cube ** 10n % P * base % P, 5), b = s(s(s(a, 10), 20), 40);
  return s(s(s(b, 80), 80, b), 10, a) ** 4n % P * base % P;
};
/** Clears and sets bits. */
export const prune = ($: Uint8Array): Uint8Array<ArrayBuffer> => {
  const a = sha512($.subarray(0, 32));
  return a[0] &= 248, a[31] = a[31] & 127 | 64, a;
};
/** Encodes binary -> bigint. */
export const en_big = ($: Uint8Array): bigint => {
  const view = new DataView($.buffer, $.byteOffset);
  return view.getBigUint64(0, true) | view.getBigUint64(8, true) << 64n |
    view.getBigUint64(16, true) << 128n | view.getBigUint64(24, true) << 192n;
};
/** Decodes bigint -> binary. */
export const de_big = ($: bigint): Uint8Array<ArrayBuffer> => {
  const a = new Uint8Array(32), b = new DataView(a.buffer, a.byteOffset);
  b.setBigUint64(24, $ >> 192n, true), b.setBigUint64(16, $ >> 128n, true);
  return b.setBigUint64(8, $ >> 64n, true), b.setBigUint64(0, $, true), a;
};
