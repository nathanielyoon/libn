import { type Decode, type Encode, map } from "./common.ts";

const enum Multiple {
  A = 85 ** 4,
  B = 85 ** 3,
  C = 85 ** 2,
  D = 85 ** 1,
}
const encode = (str: string, $: Uint8Array) => {
  let string = "", z = 0;
  while (z < $.length) {
    const a = ($[z++] << 24 | $[z++] << 16 | $[z++] << 8 | $[z++]) >>> 0;
    string += str[a / Multiple.A % 85 | 0] + str[a / Multiple.B % 85 | 0] +
      str[a / Multiple.C % 85 | 0] + str[a / Multiple.D % 85 | 0] + str[a % 85];
  }
  return string;
};
const decode = (bin: Uint8Array, $: string) => {
  const binary = new Uint8Array(Math.ceil($.length / 5) << 2);
  for (let z = 0, y = 0; z < $.length; ++y) {
    const a = binary[y + 3] = bin[$.charCodeAt(z++)] * Multiple.A +
      bin[$.charCodeAt(z++)] * Multiple.B +
      bin[$.charCodeAt(z++)] * Multiple.C +
      bin[$.charCodeAt(z++)] * Multiple.D + bin[$.charCodeAt(z++)];
    binary[y++] = a >> 24, binary[y++] = a >> 16, binary[y++] = a >> 8;
  }
  return binary;
};
const A85_STR =
  "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstu";
const A85_BIN = /* @__PURE__ */ map(A85_STR);
const Z85_STR =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#";
const Z85_BIN = /* @__PURE__ */ map(Z85_STR);
/** Encodes binary -> ascii85 string. */
export const en_a85: Encode = ($: Uint8Array): string =>
  encode(A85_STR, $).replaceAll("!!!!!", "z");
/** Decodes ascii85 string -> binary. */
export const de_a85: Decode = ($: string): Uint8Array<ArrayBuffer> =>
  decode(A85_BIN, $.replaceAll("z", "!!!!!"));
/** Encodes binary -> z85 string. */
export const en_z85: Encode = /* @__PURE__ */ encode.bind(null, Z85_STR);
/** Decodes z85 string -> binary. */
export const de_z85: Decode = /* @__PURE__ */ decode.bind(null, Z85_BIN);
