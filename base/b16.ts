/** @module */
import { type Decode, en, type Encode, map } from "./lib.ts";

const B16_STR = /* @__PURE__ */ Array.from(
  { length: 256 },
  (_, byte) => byte.toString(16).toUpperCase().padStart(2, "0"),
);
const B16_BIN = /* @__PURE__ */ map("0123456789ABCDEF", 32);
/** Converts binary to base16. */
export const enB16: Encode = ($) => {
  let string = "";
  for (let z = 0; z < $.length; ++z) string += B16_STR[$[z]];
  return string;
};
/** Converts base16 to binary. */
export const deB16: Decode = ($) => {
  const binary = new Uint8Array($.length >> 1);
  for (let z = 0; z < $.length; z += 2) {
    binary[z >> 1] = B16_BIN[en.call($, z)] << 4 | B16_BIN[en.call($, z + 1)];
  }
  return binary;
};
/** Decodable base16. */
export const B16: RegExp = /^(?:[\dA-Fa-f]{2})*$/;
