const en_64 = ($: number) =>
  $ + 65 + (25 - $ >> 8 & 6) - (51 - $ >> 8 & 75) - (61 - $ >> 8 & 13) +
  (62 - $ >> 8 & 49);
const de_64 = ($: number) =>
  ((64 - $ & $ - 91) >> 8 & $ - 64) + ((96 - $ & $ - 123) >> 8 & $ - 70) +
  ((45 - $ & $ - 58) >> 8 & $ + 5) + ((44 - $ & $ - 46) >> 8 & 63) +
  ((94 - $ & $ - 96) >> 8 & 64) - 1;
/** Encodes binary -> base64url string. */
export const en_b64 = ($: Uint8Array): string => {
  const a = new Uint8Array(Math.ceil($.length / 3 * 4));
  for (let z = 0, y = 0, b, c, d; z < $.length;) {
    b = $[z++], c = $[z++], d = $[z++];
    a[y++] = en_64(b >> 2), a[y++] = en_64(b << 4 & 63 | c >> 4);
    a[y++] = en_64(c << 2 & 63 | d >> 6), a[y++] = en_64(d & 63);
  }
  return new TextDecoder().decode(a);
};
/** Decodes base64url string -> binary. */
export const de_b64 = ($: string): Uint8Array<ArrayBuffer> => {
  const a = new Uint8Array($.length * 3 >> 2), b = $.charCodeAt.bind($);
  for (let z = 0, y = 0, c, d, e, f; z < $.length;) {
    c = de_64(b(z++)), d = de_64(b(z++)), e = de_64(b(z++)), f = de_64(b(z++));
    a[y++] = c << 2 | d >> 4, a[y++] = d << 4 | e >> 2, a[y++] = e << 6 | f;
  }
  return a;
};
const cc = String.fromCharCode;
/** Encodes key -> optionally prefixed base64url string. */
export const en_key = <A extends string = "">(
  $: Uint8Array,
  prefix?: A,
): `${A}${string}` => {
  let a = "", z = 0;
  do a += cc(en_64($[z] >> 2)) + cc(en_64($[z] << 4 & 63 | $[++z] >> 4)) +
    cc(en_64($[z] << 2 & 63 | $[++z] >> 6)) + cc(en_64($[z] & 63)); while (
    ++z < 30
  );
  return `${prefix! ?? ""}${a}${cc(en_64($[30] >> 2))}${
    cc(en_64($[30] << 4 & 63 | $[31] >> 4))
  }${cc(en_64($[31] << 2 & 63))}`;
};
