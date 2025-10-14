import { de, type Decode, en, type Encode, map } from "./lib.ts";

const de64 = (bin: Uint8Array, $: string) => {
  const binary = new Uint8Array($.length * 3 >> 2);
  for (let z = 0, y = 0; z < $.length; z += 4, y += 3) {
    const a = bin[en.call($, z + 1)], b = bin[en.call($, z + 2)];
    binary[y] = bin[en.call($, z)] << 2 | a >> 4;
    binary[y + 1] = a << 4 | b >> 2;
    binary[y + 2] = b << 6 | bin[en.call($, z + 3)];
  }
  return binary;
};

const B64_BIN = /* @__PURE__ */ map(
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
);
/** Converts binary to base64. */
export const enB64: Encode = ($) => {
  let string = "";
  for (let z = 0; z < $.length; ++z) string += de($[z]);
  return btoa(string);
};
/** Converts base64 to binary. */
export const deB64: Decode = ($) => {
  try {
    const raw = atob($), binary = new Uint8Array(raw.length);
    for (let z = 0; z < raw.length; ++z) binary[z] = en.call(raw, z);
    return binary;
  } catch {
    return de64(B64_BIN, $ = $.replace(/=+$/, ""));
  }
};
/** Decodable base64. */
export const B64 = /^(?:[+/\dA-Za-z]{4})*(?:[+/\dA-Za-z]{2}[+/\d=A-Za-z]=)?$/;

const U64_STR =
  "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
/** Converts binary to base64url. */
export const enU64: Encode = ($) => {
  let string = "";
  for (let z = 0; z < $.length; z += 3) {
    const a = $[z], b = $[z + 1], c = $[z + 2];
    string += U64_STR[a >> 2] + U64_STR[a << 4 & 48 | b >> 4] +
      U64_STR[b << 2 & 60 | c >> 6] + U64_STR[c & 63];
  }
  return string.slice(0, Math.ceil($.length / 3 * 4));
};
/** Converts base64url to binary. */
export const deU64: Decode = /* @__PURE__ */
  de64.bind(null, /* @__PURE__ */ map(U64_STR));
/** Decodable base64url. */
export const U64 = /^(?:[-\w]{4})*(?:[-\w]{2,3})?$/;
