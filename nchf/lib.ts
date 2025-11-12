/** 64-bit unsigned integer as its two 32-bit halves. */
export type U64 = { hi: number; lo: number };
/** Combines two 32-bit halves into an 64-bit unsigned integer. */
export const u64 = (hi: number, lo: number): bigint =>
  BigInt(hi >>> 0) << 32n | BigInt(lo >>> 0);
/** Multiplies two 32-bit unsigned integers. */
export const umul32 = (one: number, two: number): U64 => {
  const a = one & 0xffff, b = one >>> 16, c = two & 0xffff, d = two >>> 16;
  const e = a * c, f = b * c, g = (e >>> 16) + (f & 0xffff) + a * d;
  return {
    hi: (f >>> 16) + (g >>> 16) + b * d,
    lo: (g << 16 | e & 0xffff) >>> 0,
  };
};
/** Multiplies two 64-bit unsigned integers and updates them in-place. */
export const umul64 = (one: U64, two: U64): void => {
  const a = umul32(one.lo, two.lo), b = umul32(one.hi, two.lo);
  const c = umul32(one.lo, two.hi), d = umul32(one.hi, two.hi);
  one.lo = a.lo, one.hi = c.lo + b.lo >>> 0, one.hi < b.lo && ++c.hi;
  one.hi = one.hi + a.hi >>> 0, one.hi < a.hi && ++c.hi, two.hi = d.hi;
  two.lo = d.lo + b.hi >>> 0, two.lo < b.hi && ++two.hi;
  two.lo = two.lo + c.hi >>> 0, two.lo < c.hi && ++two.hi;
};
