const base32 = (alphabet: string) => {
  const BIN = new Uint8Array(256), STR = Array<string>(32);
  for (let z = 0, a; z < 32; ++z) {
    STR[BIN[a = alphabet.charCodeAt(z) | 32] = BIN[a - 32] = z] = alphabet[z];
  }
  return {
    encode: ($: Uint8Array): string => {
      let a = "";
      for (let z = 0, b, c, d, e, f; z < $.length;) {
        b = $[z++], c = $[z++], d = $[z++], e = $[z++], f = $[z++];
        a += STR[b >> 3] +
          STR[b << 2 & 28 | c >> 6] +
          STR[c >> 1 & 31] +
          STR[c << 4 & 16 | d >> 4] +
          STR[d << 1 & 30 | e >> 7] +
          STR[e >> 2 & 31] +
          STR[e << 3 & 24 | f >> 5] +
          STR[f & 31];
      }
      return a.slice(0, Math.ceil($.length / 5 * 8));
    },
    decode: ($: string) => {
      const A = new Uint8Array($.length * 5 >> 3), B = $.charCodeAt.bind($);
      for (let z = 0, y = 0, a, b, c, d, e, f, g, h; z < $.length;) {
        a = BIN[B(z++)], b = BIN[B(z++)], c = BIN[B(z++)], d = BIN[B(z++)];
        e = BIN[B(z++)], f = BIN[B(z++)], g = BIN[B(z++)], h = BIN[B(z++)];
        A[y++] = a << 3 | b >> 2 & 7;
        A[y++] = b << 6 & 192 | c << 1 | d >> 4 & 1;
        A[y++] = d << 4 & 240 | e >> 1 & 15;
        A[y++] = e << 7 & 128 | f << 2 | g >> 3 & 7;
        A[y++] = g << 5 & 96 | h;
      }
      return A;
    },
  };
};
const b32 = base32("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567");
export const en_b32 = b32.encode;
export const de_b32 = b32.decode;
const h32 = base32("0123456789ABCDEFGHIJKLMNOPQRSTUV");
export const en_h32 = h32.encode;
export const de_h32 = h32.decode;
