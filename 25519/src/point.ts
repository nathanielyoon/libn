import { de_big, en_big, P, p, r, v } from "./curve.ts";

const D = 0x52036cee2b6ffe738cc740797779e89800700a4d4141d8ab75eb4dca135978a3n;
const R = 0x2b8324804fc1df0b2b4d00993dfbd7a72f431806ad2fe478c4ee1b274a0ea0b0n;
const X = 0x216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51an;
const Y = 0x6666666666666666666666666666666666666666666666666666666666666658n;
// Extended representation as a 1024-bit integer.
const B = X | Y << 256n | 1n << 512n | X * Y % P << 768n, M = (1n << 256n) - 1n;
/** Adds two points. */
export const add = (one: bigint, two: bigint): bigint => {
  const a = one & M, b = one >> 256n & M, c = two & M, d = two >> 256n & M;
  const e = (one >> 512n & M) * (two >> 512n & M) % P;
  const f = (one >> 768n & M) * D * (two >> 768n & M) % P, g = e + f, i = e - f;
  const h = a * c % P + b * d % P, j = (a + b) * (c + d) % P - h;
  return p(i * j) | p(h * g) << 256n | p(g * i) << 512n | p(h * j) << 768n;
};
/** Doubles a point. */
export const double = ($: bigint): bigint => {
  const a = $ & M, b = $ >> 256n & M, c = $ >> 512n & M;
  const d = a ** 2n % P, e = P - d, f = b ** 2n % P, g = e + f, h = e - f;
  const i = g - (c * c % P << 1n) % P, j = (a + b) ** 2n % P - d - f;
  return p(i * j) | p(g * h) << 256n | p(g * i) << 512n | p(h * j) << 768n;
};
const G = /* @__PURE__ */ (() => {
  const a = Array<bigint>(4224);
  for (let z = 0, b = B, c, y; z < 4224; b = double(c)) {
    for (y = 0, a[z++] = c = b; y < 127; ++y) a[z++] = c = add(c, b);
  }
  return a;
})();
/** Multiplies the base point by a scalar. */
export const wnaf = ($: bigint): [bigint, bigint] => {
  let a = 1n << 256n | 1n << 512n, b = B, c, d, e, z = 0;
  do c = Number($ & 255n),
    $ >>= 8n,
    c > 128 && (c -= 256, ++$),
    d = G[(z << 7) + (c + (c >> 31) ^ (c >> 31)) - (c ? 1 : 0)],
    e = P - (d & M) | d & (M << 256n | M << 512n) | P - (d >> 768n) << 768n,
    c ? a = add(a, c < 0 ? e : d) : b = add(b, z & 1 ? e : d); while (++z < 33);
  return [a, b];
};
/** Encodes point (derived from scalar) -> binary. */
export const en_point = ($: bigint): Uint8Array<ArrayBuffer> => {
  const [a] = wnaf($), b = v(a >> 512n & M), c = de_big(p((a >> 256n & M) * b));
  return (a & M) * b % P & 1n && (c[31] |= 128), c;
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
        return g | b << 256n | 1n << 512n | g * b % P << 768n;
      }
  }
  return -1n;
};
/** Compares two points. */
export const equal = (one: bigint, two: bigint): boolean => {
  const a = one >> 512n & M, b = two >> 512n & M;
  return !(p((one & M) * b) ^ p(a * (two & M)) |
    p((one >> 256n & M) * b) ^ p(a * (two >> 256n & M)));
};
