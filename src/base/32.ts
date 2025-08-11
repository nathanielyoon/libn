const encode = (str: string) => ($: Uint8Array): string => {
  let a = "", b, c, d, e, f, z = 0;
  while (z < $.length) {
    b = $[z++], c = $[z++], d = $[z++], e = $[z++], f = $[z++];
    a += str[b >> 3] + str[b << 2 & 28 | c >> 6] + str[c >> 1 & 31] +
      str[c << 4 & 16 | d >> 4] + str[d << 1 & 30 | e >> 7] + str[e >> 2 & 31] +
      str[e << 3 & 24 | f >> 5] + str[f & 31];
  }
  return a.slice(0, Math.ceil($.length / 5 * 8));
};
const decode = (bin: Uint8Array) => ($: string): Uint8Array<ArrayBuffer> => {
  const a = new Uint8Array($.length * 5 >> 3), b = $.charCodeAt.bind($);
  let c, d, e, f, z = 0, y = 0;
  while (z < $.length) {
    c = bin[b(++z)], a[y++] = bin[b(z++ - 1)] << 3 | c >> 2 & 7;
    d = bin[b(++z)], a[y++] = c << 6 & 192 | bin[b(z++ - 1)] << 1 | d >> 4 & 1;
    e = bin[b(z++)], a[y++] = d << 4 & 240 | e >> 1 & 15, f = bin[b(++z)];
    a[y++] = e << 7 & 128 | bin[b(z++ - 1)] << 2 | f >> 3 & 7;
    a[y++] = f << 5 & 96 | bin[b(z++)];
  }
  return a;
};
const map = ($: string) => {
  const a = new Uint8Array(256);
  for (let z = 0, b; z < 32; ++z) a[b = $.charCodeAt(z) | 32] = a[b & 95] = z;
  return a;
};
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const H32 = "0123456789ABCDEFGHIJKLMNOPQRSTUV";
/** Encodes binary -> base32 string. */
export const en_b32: ReturnType<typeof encode> = encode(B32);
/** Decodes base32 string -> binary. */
export const de_b32: ReturnType<typeof decode> = decode(map(B32));
/** Encodes binary -> base32hex string. */
export const en_h32: ReturnType<typeof encode> = encode(H32);
/** Decodes base32hex string -> binary. */
export const de_h32: ReturnType<typeof decode> = decode(map(H32));
