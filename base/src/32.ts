import { map } from "./map.ts";

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
    a = bin[$.charCodeAt(++z)];
    binary[y++] = bin[$.charCodeAt(z++ - 1)] << 3 | a >> 2 & 7;
    b = bin[$.charCodeAt(++z)];
    binary[y++] = a << 6 & 192 | bin[$.charCodeAt(z++ - 1)] << 1 | b >> 4 & 1;
    c = bin[$.charCodeAt(z++)];
    binary[y++] = b << 4 & 240 | c >> 1 & 15;
    d = bin[$.charCodeAt(++z)];
    binary[y++] = c << 7 & 128 | bin[$.charCodeAt(z++ - 1)] << 2 | d >> 3 & 7;
    binary[y++] = d << 5 & 224 | bin[$.charCodeAt(z++)];
  }
  return binary;
};
const B32 = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const H32 = "0123456789ABCDEFGHIJKLMNOPQRSTUV";
/** Encodes binary -> base32 string. */
export const en_b32: ($: Uint8Array) => string = /* @__PURE__ */
  encode.bind(null, B32);
/** Decodes base32 string -> binary. */
export const de_b32: ($: string) => Uint8Array<ArrayBuffer> = /* @__PURE__ */
  decode.bind(null, /* @__PURE__ */ map(B32));

/** Encodes binary -> base32hex string. */
export const en_h32: ($: Uint8Array) => string = /* @__PURE__ */
  encode.bind(null, H32);
/** Decodes base32hex string -> binary. */
export const de_h32: ($: string) => Uint8Array<ArrayBuffer> = /* @__PURE__ */
  decode.bind(null, /* @__PURE__ */ map(H32));
