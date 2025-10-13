import { de, type Decode, en, type Encode, map } from "./lib.ts";

const B64_BIN = /* @__PURE__ */ map(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
);
const aToB = ($: string) => {
  try {
    return atob($); // throws on non-base64 characters or bad padding
  } catch {
    $ = $.replace(/=+$/, "");
    let string = "";
    for (let z = 0; z < $.length; z += 4) {
      const a = B64_BIN[en.call($, z + 1)], b = B64_BIN[en.call($, z + 2)];
      string += de(B64_BIN[en.call($, z)] << 2 & 252 | a >> 4) +
        de(a << 4 & 240 | b >> 2) +
        de(b << 6 & 192 | B64_BIN[en.call($, z + 3)]);
    }
    return string.slice(0, $.length * 3 >> 2);
  }
};
/** Base64 patttern. */
export const B64 = /^(?:[+/\dA-Za-z]{4})*(?:[+/\dA-Za-z]{2}[+/\d=A-Za-z]=)?$/;
/** Converts binary to base64. */
export const enB64: Encode = ($) => {
  let string = "";
  for (let z = 0; z < $.length; ++z) string += de($[z]);
  return btoa(string);
};
/** Converts base64 to binary. */
export const deB64: Decode = ($) => {
  const raw = aToB($), binary = new Uint8Array(raw.length);
  for (let z = 0; z < raw.length; ++z) binary[z] = en.call(raw, z);
  return binary;
};
const U64_STR =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const U64_BIN = /* @__PURE__ */ map(U64_STR);
/** Base64url pattern (without padding). */
export const U64 = /^(?:[-\w]{4})*(?:[-\w]{2,3})?$/;
/** Converts binary to unpadded base64url. */
export const enU64: Encode = ($) => {
  let string = "";
  for (let z = 0; z < $.length; z += 3) {
    const a = $[z], b = $[z + 1], c = $[z + 2];
    string += U64_STR[a >> 2], string += U64_STR[a << 4 & 48 | b >> 4];
    string += U64_STR[b << 2 & 60 | c >> 6], string += U64_STR[c & 63];
  }
  return string.slice(0, Math.ceil($.length / 3 * 4));
};
/** Converts unpadded base64url to binary. */
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
