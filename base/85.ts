import { type Decode, en, type Encode, map } from "./lib.ts";

const enum Step {
  A = 85 ** 4,
  B = 85 ** 3,
  C = 85 ** 2,
  D = 85 ** 1,
}
const en85 = (str: string, $: Uint8Array) => {
  let string = "";
  for (let z = 0; z < $.length; z += 4) {
    const a = ($[z] << 24 | $[z + 1] << 16 | $[z + 2] << 8 | $[z + 3]) >>> 0;
    string += str[a / Step.A % 85 | 0] + str[a / Step.B % 85 | 0] +
      str[a / Step.C % 85 | 0] + str[a / Step.D % 85 | 0] + str[a % 85];
  }
  return string;
};
const de85 = (bin: Uint8Array, $: string) => {
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
/** Converts binary to Z85. */
export const enZ85: Encode = /* @__PURE__ */ en85.bind(null, Z85_STR);
/** Converts Z85 to binary. */
export const deZ85: Decode = /* @__PURE__ */
  de85.bind(null, /* @__PURE__ */ map(Z85_STR));
/** Decodable Z85. */
export const Z85 = /^[!#-&(-+--:<-[\]^a-~]*$/;

const A85_STR =
  "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstu";
const A85_BIN = /* @__PURE__ */ map(A85_STR);
/** Converts binary to Ascii85. */
export const enA85: Encode = ($) =>
  ($.length & 3
    ? en85(A85_STR, $).slice(0, ($.length & 3) - 4)
    : en85(A85_STR, $)).replace(/(?<=^(?:[!-u]{5})*)!{5}/g, "z");
/** Converts Ascii85 to binary. */
export const deA85: Decode = ($) => {
  const as = $.replace(/\s+/g, "").replaceAll("z", "!!!!!"), to = as.length % 5;
  return to
    ? new Uint8Array(de85(A85_BIN, as + "u".repeat(5 - to)).subarray(0, to - 5))
    : de85(A85_BIN, as);
};
/** Decodable Ascii85. */
export const A85 = /^[!-uz]*$/;
