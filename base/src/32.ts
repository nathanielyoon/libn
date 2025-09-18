import { type Decode, type Encode, map } from "./common.ts";

const encode = (str: string, $: Uint8Array) => {
  let string = "";
  for (let a, b, c, d, e, z = 0; z < $.length;) {
    a = $[z++], b = $[z++], c = $[z++], d = $[z++], e = $[z++];
    string += str[a >> 3] + str[a << 2 & 28 | b >> 6] + str[b >> 1 & 31] +
      str[b << 4 & 16 | c >> 4] + str[c << 1 & 30 | d >> 7] + str[d >> 2 & 31] +
      str[d << 3 & 24 | e >> 5] + str[e & 31];
  }
  return string.slice(0, Math.ceil($.length / 5 * 8));
};
const decode = (bin: Uint8Array, $: string) => {
  const binary = new Uint8Array($.length * 5 >> 3);
  for (let a, b, c, d, z = 0, y = 0; z < $.length;) {
    a = bin[$.charCodeAt(++z)], b = bin[$.charCodeAt(++z + 1)];
    binary[y++] = bin[$.charCodeAt(++z - 3)] << 3 | a >> 2 & 7;
    binary[y++] = a << 6 & 192 | bin[$.charCodeAt(++z - 2)] << 1 | b >> 4 & 1;
    c = bin[$.charCodeAt(z++)], d = bin[$.charCodeAt(++z)];
    binary[y++] = b << 4 & 240 | c >> 1 & 15;
    binary[y++] = c << 7 & 128 | bin[$.charCodeAt(++z - 2)] << 2 | d >> 3 & 7;
    binary[y++] = d << 5 & 224 | bin[$.charCodeAt(z++)];
  }
  return binary;
};
const B32_STR = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const B32_BIN = /* @__PURE__ */ map(B32_STR);
/** Encodes binary -> base32 string. */
export const en_b32: Encode = /* @__PURE__ */ encode.bind(null, B32_STR);
/** Decodes base32 string -> binary. */
export const de_b32: Decode = /* @__PURE__ */ decode.bind(null, B32_BIN);
const H32_STR = "0123456789ABCDEFGHIJKLMNOPQRSTUV";
const H32_BIN = /* @__PURE__ */ map(H32_STR);
/** Encodes binary -> base32hex string. */
export const en_h32: Encode = /* @__PURE__ */ encode.bind(null, H32_STR);
/** Decodes base32hex string -> binary. */
export const de_h32: Decode = /* @__PURE__ */ decode.bind(null, H32_BIN);
const Z32_STR = "ybndrfg8ejkmcpqxot1uwisza345h769";
const Z32_BIN = /* @__PURE__ */ map(Z32_STR);
/** Encodes binary -> z-base-32 string. */
export const en_z32: Encode = /* @__PURE__ */ encode.bind(null, Z32_STR);
/** Decodes z-base-32 string -> binary. */
export const de_z32: Decode = /* @__PURE__ */ decode.bind(null, Z32_BIN);
const C32_STR = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const C32_BIN = /* @__PURE__ */ map(C32_STR);
/** Encodes binary -> Crockford base 32 string. */
export const en_c32: Encode = /* @__PURE__ */ encode.bind(null, C32_STR);
/** Decodes Crockford base 32 string -> binary. */
export const de_c32: Decode = /* @__PURE__ */ decode.bind(null, C32_BIN);
