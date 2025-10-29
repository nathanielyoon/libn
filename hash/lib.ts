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
/** @internal */
interface Pair<A> {
  hi: A;
  lo: A;
}
/** 64-bit integer represented as its 32-bit halves. */
export interface I64 extends Pair<number> {}
/** Converts a bigint to an integer. */
export const enInteger = ($: bigint): I64 => (
  { hi: Number($ >> 32n) >>> 0, lo: Number($ & 0xffffffffn) >>> 0 }
);
/** Converts an integer to a bigint. */
export const deInteger = ($: I64): bigint =>
  BigInt($.hi >>> 0) << 32n | BigInt($.lo >>> 0);
/** Multiplies two 32-bit integers to a 64-bit product. */
export const mul64 = (one: number, two: number): I64 => {
  const a = one & 0xffff, b = one >>> 16, c = two & 0xffff, d = two >>> 16;
  const e = a * c, f = b * c, g = (e >>> 16) + (f & 0xffff) + a * d;
  return { hi: (f >>> 16) + (g >>> 16) + b * d, lo: g << 16 | e & 0xffff };
};
/** Adds two 64-bit integers and updates the first in place. */
export const add128 = (one: I64, two: I64): void => {
  const temp = (one.lo >>> 0) + (two.lo >>> 0);
  one.hi = (one.hi >>> 0) + (two.hi >>> 0) + (temp / 0x100000000 | 0) | 0;
  one.lo = temp | 0;
};
/** Multiplies two 64-bit integers to a 128-bit product and updates in place. */
export const mul128 = (one: I64, two: I64): void => {
  const a = one.lo >>> 0, b = one.hi >>> 0, c = two.lo >>> 0, d = two.hi >>> 0;
  const e = mul64(a, c), f = mul64(b, c), g = mul64(a, d), h = mul64(b, d);
  add128(g, { hi: 0, lo: f.lo }), add128(g, { hi: 0, lo: e.hi });
  add128(h, { hi: 0, lo: f.hi }), add128(h, { hi: 0, lo: g.hi });
  one.hi = g.lo, one.lo = e.lo, two.hi = h.hi, two.lo = h.lo;
};
