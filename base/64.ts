/** @module */
import { type De, type Decode, type En, type Encode, from } from "./lib.ts";

const en64 = (en: En, binary: Uint8Array) => {
  let string = "";
  for (let z = 0; z < binary.length; z += 3) {
    const a = binary[z], b = binary[z + 1], c = binary[z + 2];
    string += from(en(a >> 2)) + from(en(a << 4 & 48 | b >> 4)) +
      from(en(b << 2 & 60 | c >> 6)) + from(en(c & 63));
  }
  return string.slice(0, Math.ceil(binary.length * 4 / 3));
};
const de64 = (de: De, string: string) => {
  const binary = new Uint8Array(string.length * 3 >> 2);
  for (let z = 0, y = 0; z < string.length; z += 4, y += 3) {
    const a = de(string.charCodeAt(z + 1)), b = de(string.charCodeAt(z + 2));
    binary[y] = de(string.charCodeAt(z)) << 2 | a >> 4;
    binary[y + 1] = a << 4 | b >> 2;
    binary[y + 2] = b << 6 | de(string.charCodeAt(z + 3));
  }
  return binary;
};

/** Converts binary to base64. */
export const enB64: Encode = /* @__PURE__ */ en64.bind(
  null,
  ($) =>
    $ + 65 + (25 - $ >> 8 & 6) - (51 - $ >> 8 & 75) - (61 - $ >> 8 & 15) +
    (62 - $ >> 8 & 3),
);
/** Converts base64 to binary. */
export const deB64: Decode = /* @__PURE__ */ de64.bind(
  null,
  ($) =>
    $ + 19 - (46 - $ >> 8 & 3) - (47 - $ >> 8 & 12) - (60 - $ >> 8 & 64) -
    (64 - $ >> 8 & 5) - (96 - $ >> 8 & 6),
);
/** Valid base64. */
export const B64: RegExp = /^(?:[+/\dA-Za-z]{4})*(?:[+/\dA-Za-z]{2,3})?$/;

/** Converts binary to base64url. */
export const enU64: Encode = /* @__PURE__ */ en64.bind(
  null,
  ($) =>
    $ + 65 + (25 - $ >> 8 & 6) - (51 - $ >> 8 & 75) - (61 - $ >> 8 & 13) +
    (62 - $ >> 8 & 49),
);
/** Converts base64url to binary. */
export const deU64: Decode = /* @__PURE__ */ de64.bind(
  null,
  ($) =>
    $ + 17 - (47 - $ >> 8 & 13) - (60 - $ >> 8 & 65) - (64 - $ >> 8 & 4) +
    (94 - $ >> 8 & 33) - (96 - $ >> 8 & 39),
);
/** Valid base64url. */
export const U64: RegExp = /^(?:[-\w]{4})*(?:[-\w]{2,3})?$/;

/** Adds padding to a string. */
export const enPad = (string: string): string => {
  switch (string.length & 3) {
    default:
      return string;
    case 3:
      return string + "=";
    case 2:
      return string + "==";
  }
};
/** Removes padding from a string. */
export const dePad = (string: string): string =>
  string[string.length - 2] === "="
    ? string.slice(0, -2)
    : string[string.length - 1] === "="
    ? string.slice(0, -1)
    : string;
