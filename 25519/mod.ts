import { sha512 } from "./hash.ts";

const P = (1n << 255n) - 19n, M = (1n << 256n) - 1n, F = ~(1n << 255n);
const N = 1n << 252n | 0x14def9dea2f79cd65812631a5cf5d3edn; // curve order
const D = 0x52036cee2b6ffe738cc740797779e89800700a4d4141d8ab75eb4dca135978a3n;
const X = 0x216936d3cd6e53fec0a4e231fdd6dc5c692cc7609525a7b2c9562d608f25d51an;
const Y = 0x6666666666666666666666666666666666666666666666666666666666666658n;
const B = X | Y << 256n | 1n << 512n | X * Y % P << 768n; // base point
const p = ($: bigint) => ($ %= P) < 0n ? $ + P : $;
const s = (base: bigint, power: number, multiplier = base) => {
  do base = base * base % P; while (--power); // break up exponentiation by % P
  return base * multiplier % P;
};
const v = ($: bigint) => {
  let a = 0n, b = p($), c = P, d = 1n, e = 0n, f, g;
  while (f = b) b = c % f, c /= f, g = a - c * d, a = d, d = g, e *= ~c, c = f;
  return p(a);
};
const r = (base: bigint, cube = base ** 3n) => {
  const a = s(cube ** 10n % P * base % P, 5), b = s(s(s(a, 10), 20), 40);
  return s(s(s(b, 80), 80, b), 10, a) ** 4n % P * base % P;
};
const en_big = ($: Uint8Array, view = new DataView($.buffer, $.byteOffset)) =>
  view.getBigUint64(0, true) | view.getBigUint64(8, true) << 64n |
  view.getBigUint64(16, true) << 128n | view.getBigUint64(24, true) << 192n;
const de_big = ($: bigint, into = new Uint8Array(32)) => {
  const a = new DataView(into.buffer, into.byteOffset);
  a.setBigUint64(24, $ >> 192n, true), a.setBigUint64(16, $ >> 128n, true);
  return a.setBigUint64(8, $ >> 64n, true), a.setBigUint64(0, $, true), into;
};
const prune = ($: Uint8Array) => {
  const a = sha512($.subarray(0, 32));
  return a[0] &= 248, a[31] = a[31] & 127 | 64, a;
};
const add = (one: bigint, two: bigint) => {
  const a = one & M, b = one >> 256n & M, c = two & M, d = two >> 256n & M;
  const e = (one >> 512n & M) * (two >> 512n & M) % P;
  const f = (one >> 768n & M) * D * (two >> 768n & M) % P, g = e + f, i = e - f;
  const h = a * c % P + b * d % P, j = (a + b) * (c + d) % P - h;
  return p(i * j) | p(h * g) << 256n | p(g * i) << 512n | p(h * j) << 768n;
};
const double = ($: bigint) => {
  const a = $ & M, b = $ >> 256n & M, c = $ >> 512n & M;
  const d = a ** 2n % P, e = P - d, f = b ** 2n % P, g = e + f, h = e - f;
  const i = g - (c * c % P << 1n) % P, j = (a + b) ** 2n % P - d - f;
  return p(i * j) | p(g * h) << 256n | p(g * i) << 512n | p(h * j) << 768n;
};
const G = /* @__PURE__ */ (() => { // pre-computed multiples of base point
  const a = Array<bigint>(4224);
  for (let z = 0, b = B, c, y; z < 4224; b = double(c)) {
    for (y = 0, a[z++] = c = b; y < 127; ++y) a[z++] = c = add(c, b);
  }
  return a;
})();
const wnaf = ($: bigint) => {
  let a = 1n << 256n | 1n << 512n, b = B, c, d, e, z = 0;
  do (c = Number($ & 255n), $ >>= 8n, c > 128 && (c -= 256, ++$)),
    d = G[(z << 7) + (c + (c >> 31) ^ (c >> 31)) - (c ? 1 : 0)],
    e = P - (d & M) | d & (M << 256n | M << 512n) | P - (d >> 768n) << 768n,
    c ? a = add(a, c < 0 ? e : d) : b = add(b, z & 1 ? e : d); while (++z < 33);
  return [a, b];
};
const scalar = ($: bigint) => {
  const [a] = wnaf($), b = v(a >> 512n & M), c = de_big(p((a >> 256n & M) * b));
  return (a & M) * b % P & 1n && (c[31] |= 128), c;
};
const point = ($: Uint8Array) => {
  const a = $[31] >> 7, b = en_big($) & F, c = b * b % P, d = p(c - 1n);
  const e = c * D + 1n, f = e ** 3n % P;
  let g = r(d * e * f * f % P) * d * f % P;
  switch (e * g * g % P) {
    case P - d:
      g = g *
          0x2b8324804fc1df0b2b4d00993dfbd7a72f431806ad2fe478c4ee1b274a0ea0b0n %
        P; // falls through
    case d:
      if (!a || g) {
        if (Number(g & 1n) ^ a) g = P - g;
        return g | b << 256n | 1n << 512n | g * b % P << 768n;
      }
  }
  return -1n;
};
const int = ($: Uint8Array) => {
  const a = sha512($), b = new DataView(a.buffer);
  return (en_big(a, b) | en_big(a.copyWithin(0, 32), b) << 256n) % N;
};
/** Derives a public key from a secret key. */
export const generate = ($: Uint8Array): Uint8Array<ArrayBuffer> =>
  scalar(en_big(prune($)));
/** Creates an Ed25519 digital signature. */
export const sign = (
  secret_key: Uint8Array,
  data: Uint8Array,
): Uint8Array<ArrayBuffer> => {
  const a = prune(secret_key), b = new Uint8Array(data.length + 64);
  b.set(a.subarray(32)), b.set(data, 32);
  const c = en_big(a), d = int(b.subarray(0, -32));
  a.set(scalar(d)), b.set(a), b.set(scalar(c), 32), b.set(data, 64);
  return de_big((d + c * int(b) % N) % N, a.subarray(32)), a;
};
/** Verifies a signed message. */
export const verify = (
  public_key: Uint8Array,
  data: Uint8Array,
  signature: Uint8Array,
): boolean => {
  if (signature.length !== 64) return false;
  const a = en_big(signature.subarray(32));
  if (a >= N) return false;
  const b = new Uint8Array(data.length + 64);
  b.set(signature), b.set(public_key, 32), b.set(data, 64);
  let c = 1n << 256n | 1n << 512n, d = point(public_key);
  if (d < 0n) return false;
  let e = int(b), f;
  do e & 1n && (c = add(c, d)), d = double(d); while (e >>= 1n);
  d = point(signature);
  if (d < 0n) return false;
  c = add(c, d), d = wnaf(a)[0], e = c >> 512n & M, f = d >> 512n & M;
  return !(p((c & M) * f) ^ p(e * (d & M)) |
    p((c >> 256n & M) * f) ^ p(e * (d >> 256n & M)));
};
const ladder = (scalar: bigint, point: bigint) => {
  let a = 1n, b = 0n, c = point, d = 1n, e = 0n, f, g, z = 254n;
  do e ^= f = scalar >> z & 1n, // read scalar bit
    a ^= g = (a ^ c) & -e, // cswap 1
    c ^= g,
    d ^= g = (b ^ d) & -e, // cswap 2
    a -= b ^= g, // saves an operation
    b += a + b,
    e = f,
    f = a * (c + d) % P,
    g = b * (c - d) % P,
    c = (g + f) ** 2n % P,
    d = (g - f) ** 2n % P * point % P,
    a = a * a % P,
    b = b * b % P,
    f = b - a,
    a = a * b % P,
    b = f * (f * 121665n % P + b) % P; while (z--);
  return p(s(r(b ^= (b ^ d) & -e, b **= 3n), 3, a ^ (a ^ c) & -e) * b) & F;
};
/** Multiplies a public coordinate (if omitted, the generator) by a scalar. */
export const x25519 = (
  secret_key: Uint8Array,
  public_key?: Uint8Array,
): Uint8Array<ArrayBuffer> =>
  de_big(ladder(
    en_big(secret_key) & ~7n & F | 1n << 254n,
    public_key ? en_big(public_key) & F : 9n,
  ));
/** Converts a secret key to its Montgomery equivalent. */
export const convert_secret = ($: Uint8Array): Uint8Array<ArrayBuffer> =>
  new Uint8Array(prune($).subarray(0, 32));
/** Converts a public key to its Montgomery equivalent. */
export const convert_public = ($: Uint8Array): Uint8Array<ArrayBuffer> => {
  const a = en_big($) & F;
  return de_big(p((1n + a) * v(1n - a)) & F);
};
