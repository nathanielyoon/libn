const BIN = new Uint8Array(256), STR = Array<string>(256);
for (let z = 0, a; z < 16; ++z) {
  BIN[a = z.toString(16).charCodeAt(0)] = BIN[a - 32] = z;
}
for (let z = 0; z < 256; ++z) STR[z] = z.toString(16).padStart(2, "0");
/** Encodes binary -> base16 string. */
export const en_b16 = ($: Uint8Array): string => {
  let a = "";
  for (let z = 0; z < $.length; ++z) a += STR[$[z]];
  return a;
};
/** Decodes base16 string -> binary. */
export const de_b16 = ($: string): Uint8Array<ArrayBuffer> => {
  const a = new Uint8Array($.length >> 1), b = $.charCodeAt.bind($);
  for (let z = 0; z < $.length;) a[z >> 1] = BIN[b(z++)] << 4 | BIN[b(z++)];
  return a;
};
