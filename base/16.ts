const BIN = /* @__PURE__ */ (() => {
  const a = new Uint8Array(256);
  for (let z = 0, b; z < 16; ++z) {
    a[b = z.toString(16).charCodeAt(0) | 32] = a[b & 95] = z;
  }
  return a;
})();
const STR = /* @__PURE__ */ (() => {
  const a = Array<string>(256);
  for (let z = 0; z < 256; ++z) a[z] = z.toString(16).padStart(2, "0");
  return a;
})();
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
