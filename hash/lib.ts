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
  return {
    hi: (f >>> 16) + (g >>> 16) + b * d,
    lo: (g << 16 | e & 0xffff) >>> 0,
  };
};
/** Adds two 64-bit integers and updates the first in place. */
export const add128 = (one: I64, two: I64): void => {
  one.lo = one.lo + two.lo >>> 0, one.hi += two.hi, one.lo < two.lo && ++one.hi;
};
/** Multiplies two 64-bit integers to a 128-bit product and updates in place. */
export const mul128 = (one: I64, two: I64): void => {
  const a = mul64(one.lo, two.lo), b = mul64(one.hi, two.lo);
  const c = mul64(one.lo, two.hi), d = mul64(one.hi, two.hi);
  one.lo = a.lo, one.hi = c.lo + b.lo >>> 0, one.hi < b.lo && ++c.hi;
  one.hi = one.hi + a.hi >>> 0, one.hi < a.hi && ++c.hi, two.hi = d.hi;
  two.lo = d.lo + b.hi >>> 0, two.lo < b.hi && ++two.hi;
  two.lo = two.lo + c.hi >>> 0, two.lo < c.hi && ++two.hi;
};
