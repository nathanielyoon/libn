import { de_big, en_big, P, p, r, v } from "./field.ts";

const D = 0x52036cee2b6ffe738cc740797779e89800700a4d4141d8ab75eb4dca135978a3n;
const R = 0x2b8324804fc1df0b2b4d00993dfbd7a72f431806ad2fe478c4ee1b274a0ea0b0n;
const X = 0x216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51an;
const Y = 0x6666666666666666666666666666666666666666666666666666666666666658n;
// An extended point with 256-bit coordinates `(X, Y, Z, T)` is a 1024-bit
// integer `X | Y << 256n | Z << 512n | T << 768n`.
const Z1 = 1n << 512n, MX = (1n << 256n) - 1n, MYZ = MX << 256n | MX << 512n;
/** Identity point. */
export const I = 1n << 256n | Z1;
// Base point.
const B = X | Y << 256n | Z1 | X * Y % P << 768n;
/** Adds two points. */
export const add = (one: bigint, two: bigint): bigint => {
  const a = one & MX, b = one >> 256n & MX, c = two & MX, d = two >> 256n & MX;
  const e = (one >> 512n & MX) * (two >> 512n & MX) % P;
  const f = (one >> 768n) * D * (two >> 768n) % P, g = e + f;
  const h = e - f, i = a * c % P + b * d % P, j = (a + b) * (c + d) % P - i;
  return p(h * j) | p(i * g) << 256n | p(g * h) << 512n | p(i * j) << 768n;
};
/** Doubles a point. */
export const double = ($: bigint): bigint => {
  const a = $ & MX, b = $ >> 256n & MX, c = $ >> 512n & MX, d = a ** 2n % P;
  const e = P - d, f = b ** 2n % P, g = e + f, h = e - f;
  const i = g - (c * c % P << 1n) % P, j = (a + b) ** 2n % P - d - f;
  return p(i * j) | p(g * h) << 256n | p(g * i) << 512n | p(h * j) << 768n;
};
const G = /* @__PURE__ */ (() => {
  const a = Array<bigint>(4224);
  for (let b = B, c, z = 0, y; z < 4224; b = double(c)) {
    for (y = 0, a[z++] = c = b; y < 127; ++y) a[z++] = c = add(c, b);
  }
  return a;
})();
/** Multiplies the base point by a scalar. */
export const wnaf = ($: bigint): { a: bigint; _: bigint } => {
  let a = I, b = B, c, d, e, z = 0;
  do c = Number($ & 255n),
    $ >>= 8n,
    c > 128 && (c -= 256, ++$),
    d = G[(z << 7) + (c + (c >> 31) ^ (c >> 31)) - (c ? 1 : 0)],
    e = P - (d & MX) | d & MYZ | P - (d >> 768n) << 768n,
    c ? a = add(a, c < 0 ? e : d) : b = add(b, z & 1 ? e : d); while (++z < 33);
  return { a, _: b };
};
/** Encodes point (derived from scalar) -> binary. */
export const en_point = ($: bigint): Uint8Array<ArrayBuffer> => {
  const { a, _ } = wnaf($), b = v(a >> 512n & MX);
  const c = de_big(p((a >> 256n & MX) * b));
  return (a & MX) * b % P & 1n && (c[31] |= 128), c;
};
/** Decodes binary -> point, returns -1 if invalid. */
export const de_point = ($: Uint8Array): bigint => {
  const a = $[31] >> 7, b = en_big($) & ~(1n << 255n), c = b * b % P;
  const d = p(c - 1n), e = c * D + 1n, f = e ** 3n % P;
  let g = r(d * e * f * f % P) * d * f % P;
  switch (e * g * g % P) {
    case P - d:
      g = g * R % P; // falls through
    case d:
      if (!a || g) {
        if (Number(g & 1n) ^ a) g = P - g;
        return g | b << 256n | Z1 | g * b % P << 768n;
      }
  }
  return -1n;
};
/** Compares two points. */
export const equal = (one: bigint, two: bigint): boolean => {
  const t1 = one >> 512n & MX, t2 = two >> 512n & MX;
  return !(p((one & MX) * t2) ^ p(t1 * (two & MX)) |
    p((one >> 256n & MX) * t2) ^ p(t1 * (two >> 256n & MX)));
};
