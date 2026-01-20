/** @module */
import { type De, type Decode, type En, type Encode, from } from "./lib.ts";

const en: En = ($) => $ + 48 + (9 - $ >> 8 & 7);
const de: De = ($) => $ - 48 - (64 - $ >> 8 & 7);

/** Converts binary to base16. */
export const enB16: Encode = (binary) => {
  let string = "";
  for (let z = 0; z < binary.length; ++z) {
    string += from(en(binary[z] >> 4)) + from(en(binary[z] & 0xf));
  }
  return string;
};
/** Converts base16 to binary. */
export const deB16: Decode = (string) => {
  const binary = new Uint8Array(string.length >> 1);
  for (let z = 0; z < string.length; z += 2) {
    binary[z >> 1] = de(string.charCodeAt(z)) << 4 |
      de(string.charCodeAt(z + 1));
  }
  return binary;
};
/** Decodable base16. */
export const B16: RegExp = /^(?:[\dA-F]{2})*$/;
