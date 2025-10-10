import { type Decode, en, type Encode, map } from "./lib.ts";

const enum Step {
  A = 85 ** 4,
  B = 85 ** 3,
  C = 85 ** 2,
  D = 85 ** 1,
}
const encode = (str: string, $: Uint8Array) => {
  let string = "";
  for (let z = 0; z < $.length; z += 4) {
    const a = ($[z] << 24 | $[z + 1] << 16 | $[z + 2] << 8 | $[z + 3]) >>> 0;
    string += str[a / Step.A % 85 | 0] + str[a / Step.B % 85 | 0] +
      str[a / Step.C % 85 | 0] + str[a / Step.D % 85 | 0] + str[a % 85];
  }
  return string;
};
const decode = (bin: Uint8Array, $: string) => {
  const binary = new Uint8Array(Math.ceil($.length / 5 * 4));
  for (let z = 0, y = 0; z < $.length; z += 5, y += 4) {
    const a = binary[y + 3] = bin[en.call($, z)] * Step.A +
      bin[en.call($, z + 1)] * Step.B + bin[en.call($, z + 2)] * Step.C +
      bin[en.call($, z + 3)] * Step.D + bin[en.call($, z + 4)];
    binary[y] = a >> 24, binary[y + 1] = a >> 16, binary[y + 2] = a >> 8;
  }
  return binary;
};
const Z85_STR =
  "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#";
const Z85_BIN = /* @__PURE__ */ map(Z85_STR, 0);
const A85_STR =
  "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstu";
const A85_BIN = /* @__PURE__ */ map(A85_STR, 0);
/** Z85 pattern. */
export const Z85 = /^[!#-&(-+--:<-[\]^a-~]*$/;
/** Converts binary to z85. */
export const enZ85: Encode = /* @__PURE__ */ encode.bind(null, Z85_STR);
/** Converts z85 to binary. */
export const deZ85: Decode = /* @__PURE__ */ decode.bind(null, Z85_BIN);
/** Ascii85 pattern. */
export const A85 = /^[!-u]*$/;
/** Converts binary to ascii85. */
export const enA85: Encode = ($) => {
  const string = encode(A85_STR, $), to = $.length % 4;
  return (to ? string.slice(0, (to - 4) % 4) : string).replaceAll("!!!!!", "z");
};
/** Converts ascii85 to binary. */
export const deA85: Decode = ($) => {
  const clean = $.replace(/\s+/g, "").replaceAll("z", "!!!!!");
  const padding = "u".repeat((5 - clean.length % 5) % 5);
  const binary = decode(A85_BIN, clean + padding);
  return padding ? new Uint8Array(binary.subarray(0, -padding.length)) : binary;
};
