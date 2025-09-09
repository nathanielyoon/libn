/** Encodes binary -> base64 string. */
export const en_b64 = ($: Uint8Array): string => {
  let string = "";
  for (let z = 0; z < $.length; ++z) string += String.fromCharCode($[z]);
  return btoa(string);
};
/** Decodes base64 string -> binary. */
export const de_b64 = ($: string): Uint8Array<ArrayBuffer> => {
  const raw = atob($), at = raw.charCodeAt.bind(raw);
  const binary = new Uint8Array(raw.length);
  for (let z = 0; z < raw.length; ++z) binary[z] = at(z);
  return binary;
};
const en_c64 = ($: number) =>
  $ + 65 + (25 - $ >> 8 & 6) - (51 - $ >> 8 & 75) - (61 - $ >> 8 & 13) +
  (62 - $ >> 8 & 49);
const de_c64 = ($: number) =>
  ((64 - $ & $ - 91) >> 8 & $ - 64) + ((96 - $ & $ - 123) >> 8 & $ - 70) +
  ((45 - $ & $ - 58) >> 8 & $ + 5) + ((44 - $ & $ - 46) >> 8 & 63) +
  ((94 - $ & $ - 96) >> 8 & 64) - 1;
/** Encodes binary -> base64url string. */
export const en_u64 = ($: Uint8Array): string => {
  let string = "";
  for (let z = 0, a, b, c; z < $.length;) {
    a = $[z++], string += String.fromCharCode(en_c64(a >> 2));
    b = $[z++], string += String.fromCharCode(en_c64(a << 4 & 63 | b >> 4));
    c = $[z++], string += String.fromCharCode(en_c64(b << 2 & 63 | c >> 6));
    string += String.fromCharCode(en_c64(c & 63));
  }
  return string.slice(0, Math.ceil($.length / 3 * 4));
};
/** Decodes base64url string -> binary. */
export const de_u64 = ($: string): Uint8Array<ArrayBuffer> => {
  const binary = new Uint8Array($.length * 3 >> 2);
  for (let a, b, c, d, z = 0, y = 0; z < $.length;) {
    a = de_c64($.charCodeAt(z++)), b = de_c64($.charCodeAt(z++));
    c = de_c64($.charCodeAt(z++)), d = de_c64($.charCodeAt(z++));
    binary[y++] = a << 2 | b >> 4, binary[y++] = b << 4 | c >> 2;
    binary[y++] = c << 6 | d;
  }
  return binary;
};
