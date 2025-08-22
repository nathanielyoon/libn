const cc = String.fromCharCode;
/** Encodes binary -> base64 string. */
export const en_b64 = ($: Uint8Array): string => {
  let a = "";
  for (let z = 0; z < $.length; ++z) a += cc($[z]);
  return btoa(a);
};
/** Decodes base64 string -> binary. */
export const de_b64 = ($: string): Uint8Array<ArrayBuffer> => {
  const a = atob($), b = a.charCodeAt.bind(a), c = new Uint8Array(a.length);
  for (let z = 0; z < a.length; ++z) c[z] = b(z);
  return c;
};
const c_u64 = ($: number) =>
  $ + 65 + (25 - $ >> 8 & 6) - (51 - $ >> 8 & 75) - (61 - $ >> 8 & 13) +
  (62 - $ >> 8 & 49);
const n_u64 = ($: number) =>
  ((64 - $ & $ - 91) >> 8 & $ - 64) + ((96 - $ & $ - 123) >> 8 & $ - 70) +
  ((45 - $ & $ - 58) >> 8 & $ + 5) + ((44 - $ & $ - 46) >> 8 & 63) +
  ((94 - $ & $ - 96) >> 8 & 64) - 1;
/** Encodes binary -> base64url string. */
export const en_u64 = ($: Uint8Array): string => {
  let a = "";
  for (let z = 0, y = 0, b, c, d; z < $.length;) {
    b = $[z++], c = $[z++], d = $[z++];
    a += cc(c_u64(b >> 2)), a += cc(c_u64(b << 4 & 63 | c >> 4));
    a += cc(c_u64(c << 2 & 63 | d >> 6)), a += cc(c_u64(d & 63));
  }
  return a.slice(0, Math.ceil($.length / 3 * 4));
};
/** Decodes base64url string -> binary. */
export const de_u64 = ($: string): Uint8Array<ArrayBuffer> => {
  const a = new Uint8Array($.length * 3 >> 2);
  for (let z = 0, y = 0, c, d, e, f; z < $.length;) {
    c = n_u64($.charCodeAt(z++)), d = n_u64($.charCodeAt(z++));
    e = n_u64($.charCodeAt(z++)), f = n_u64($.charCodeAt(z++));
    a[y++] = c << 2 | d >> 4, a[y++] = d << 4 | e >> 2, a[y++] = e << 6 | f;
  }
  return a;
};
