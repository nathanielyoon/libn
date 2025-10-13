import { type Decode, en, type Encode, map } from "./lib.ts";

const U64_STR =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const U64_BIN = /* @__PURE__ */ map(U64_STR);
/** Converts binary to base64url. */
export const enU64: Encode = ($) => {
  let string = "";
  for (let z = 0; z < $.length; z += 3) {
    const a = $[z], b = $[z + 1], c = $[z + 2];
    string += U64_STR[a >> 2], string += U64_STR[a << 4 & 48 | b >> 4];
    string += U64_STR[b << 2 & 60 | c >> 6], string += U64_STR[c & 63];
  }
  return string.slice(0, Math.ceil($.length / 3 * 4));
};
/** Converts base64url to binary. */
export const deU64: Decode = ($) => {
  const binary = new Uint8Array($.length * 3 >> 2);
  for (let z = 0, y = 0; z < $.length; z += 4, y += 3) {
    const a = U64_BIN[en.call($, z + 1)], b = U64_BIN[en.call($, z + 2)];
    binary[y] = U64_BIN[en.call($, z)] << 2 | a >> 4;
    binary[y + 1] = a << 4 | b >> 2;
    binary[y + 2] = b << 6 | U64_BIN[en.call($, z + 3)];
  }
  return binary;
};
/** Decodable base64url. */
export const U64 = /^(?:[-\w]{4})*(?:[-\w]{2,3})?$/;
