import { sha512 } from "@libn/hash/sha2";

/** Clears and sets bits. */
export const prune = ($: Uint8Array): Uint8Array<ArrayBuffer> => {
  const a = sha512($.subarray(0, 32));
  // Only clamp the lower half, upper is treated as a scalar (or unused).
  return a[0] &= 248, a[31] = a[31] & 127 | 64, a;
};
/** Encodes binary to a bigint. */
export const enBig = ($: Uint8Array): bigint => {
  const a = new DataView($.buffer, $.byteOffset);
  return a.getBigUint64(0, true) | a.getBigUint64(8, true) << 64n |
    a.getBigUint64(16, true) << 128n | a.getBigUint64(24, true) << 192n;
};
/** Decodes a bigint to binary. */
export const deBig = ($: bigint): Uint8Array<ArrayBuffer> => {
  const a = new Uint8Array(32), b = new DataView(a.buffer, a.byteOffset);
  b.setBigUint64(24, $ >> 192n, true), b.setBigUint64(16, $ >> 128n, true);
  return b.setBigUint64(8, $ >> 64n, true), b.setBigUint64(0, $, true), a;
};
/** Curve25519 prime. */
export const P: bigint = /* @__PURE__ */ (() => (1n << 255n) - 19n)();
/** Curve25519 order. */
export const N: bigint = /* @__PURE__ */
  (() => 1n << 252n | 0x14def9dea2f79cd65812631a5cf5d3edn)();
/** Reduces modulo P. */
export const mod = ($: bigint): bigint => ($ %= P) < 0n ? $ + P : $;
/** Raises to a power modulo P. */
export const pow = (base: bigint, power: number, multiplier = base): bigint => {
  do base = base * base % P; while (--power); // use `% P` to avoid bigint limit
  return base * multiplier % P;
};
/** Inverts modulo P. */
export const inv = ($: bigint): bigint => {
  let a = 0n, b = mod($), c = P, d = 1n, e = 0n, f, g;
  while (f = b) b = c % f, c /= f, g = a - c * d, a = d, d = g, e *= ~c, c = f;
  return mod(a);
};
/** Common exponentiation. */
export const exp = (base: bigint, cube = base ** 3n): bigint => {
  const a = pow(cube ** 10n % P * base % P, 5);
  const b = pow(pow(pow(a, 10), 20), 40);
  return pow(pow(pow(b, 80), 80, b), 10, a) ** 4n % P * base % P;
};
const D = 0x52036cee2b6ffe738cc740797779e89800700a4d4141d8ab75eb4dca135978a3n;
const R = 0x2b8324804fc1df0b2b4d00993dfbd7a72f431806ad2fe478c4ee1b274a0ea0b0n;
const X = 0x216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51an;
const Y = 0x6666666666666666666666666666666666666666666666666666666666666658n;
// An extended point with 256-bit coordinates `(X, Y, Z, T)` is a 1024-bit
// integer `X | Y << 256n | Z << 512n | T << 768n`.
const Z1 = /* @__PURE__ */ (() => 1n << 512n)();
const MX = /* @__PURE__ */ (() => (1n << 256n) - 1n)();
/** Identity point. */
export const I: bigint = /* @__PURE__ */ (() => Z1 | 1n << 256n)();
/** Adds two points. */
export const add = (one: bigint, two: bigint): bigint => {
  const a = one & MX, b = one >> 256n & MX, c = two & MX, d = two >> 256n & MX;
  const e = (one >> 512n & MX) * (two >> 512n & MX) % P;
  const f = (one >> 768n) * D * (two >> 768n) % P, g = e + f;
  const h = e - f, i = a * c % P + b * d % P, j = (a + b) * (c + d) % P - i;
  return mod(h * j) | mod(i * g) << 256n | mod(g * h) << 512n |
    mod(i * j) << 768n;
};
/** Doubles a point. */
export const double = ($: bigint): bigint => {
  const a = $ & MX, b = $ >> 256n & MX, c = $ >> 512n & MX, d = a ** 2n % P;
  const e = P - d, f = b ** 2n % P, g = e + f, h = e - f;
  const i = g - (c * c % P << 1n) % P, j = (a + b) ** 2n % P - d - f;
  return mod(i * j) | mod(g * h) << 256n | mod(g * i) << 512n |
    mod(h * j) << 768n;
};
const G = /* @__PURE__ */ (() => {
  const a = Array<bigint>(4224);
  let b = X | Y << 256n | Z1 | X * Y % P << 768n, c, z = 0, y;
  do {
    y = 0, a[z++] = c = b;
    do a[z++] = c = add(c, b); while (++y < 127);
    b = double(c);
  } while (z < 4224);
  return a;
})();
/** Multiplies the base point by a scalar. */
export const wnaf = ($: bigint): { a: bigint; _: bigint } => {
  let a = I, b = X | Y << 256n | Z1 | X * Y % P << 768n, c, d, e, z = 0;
  do c = Number($ & 255n),
    $ >>= 8n,
    c > 128 && (c -= 256, ++$),
    d = G[(z << 7) + (c + (c >> 31) ^ (c >> 31)) - (c ? 1 : 0)],
    e = P - (d & MX) | d & (MX << 256n | MX << 512n) | P - (d >> 768n) << 768n,
    c ? a = add(a, c < 0 ? e : d) : b = add(b, z & 1 ? e : d); while (++z < 33);
  return { a, _: b };
};
/** Encodes a point (derived from scalar) to binary. */
export const enPoint = ($: bigint): Uint8Array<ArrayBuffer> => {
  const { a, _: _ } = wnaf($), b = inv(a >> 512n & MX);
  const c = deBig(mod((a >> 256n & MX) * b));
  return (a & MX) * b % P & 1n && (c[31] |= 128), c;
};
/** Decodes binary to a point, or -1 if invalid. */
export const dePoint = ($: Uint8Array): bigint => {
  const a = $[31] >> 7, b = enBig($) & ~(1n << 255n), c = b * b % P;
  const d = mod(c - 1n), e = c * D + 1n, f = e ** 3n % P;
  let g = exp(d * e * f * f % P) * d * f % P;
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
export const equals = (one: bigint, two: bigint): boolean => {
  const t1 = one >> 512n & MX, t2 = two >> 512n & MX;
  return !(mod((one & MX) * t2) ^ mod(t1 * (two & MX)) |
    mod((one >> 256n & MX) * t2) ^ mod(t1 * (two >> 256n & MX)));
};
