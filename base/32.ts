import { type Decode, en, type Encode, map } from "./lib.ts";

const encode = (str: string, $: Uint8Array) => {
  let string = "";
  for (let z = 0; z < $.length; z += 5) {
    const a = $[z], b = $[z + 1], c = $[z + 2], d = $[z + 3], e = $[z + 4];
    string += str[a >> 3] + str[a << 2 & 28 | b >> 6] + str[b >> 1 & 31] +
      str[b << 4 & 16 | c >> 4] + str[c << 1 & 30 | d >> 7] + str[d >> 2 & 31] +
      str[d << 3 & 24 | e >> 5] + str[e & 31];
  }
  return string.slice(0, Math.ceil($.length / 5 * 8));
};
const decode = (bin: Uint8Array, $: string) => {
  const binary = new Uint8Array($.length * 5 >> 3);
  for (let z = 0, y = 0; z < $.length; z += 8, y += 5) {
    const a = bin[en.call($, z + 1)], b = bin[en.call($, z + 3)];
    const c = bin[en.call($, z + 4)], d = bin[en.call($, z + 6)];
    binary[y] = bin[en.call($, z)] << 3 | a >> 2 & 7;
    binary[y + 1] = a << 6 & 192 | bin[en.call($, z + 2)] << 1 | b >> 4 & 1;
    binary[y + 2] = b << 4 & 240 | c >> 1 & 15;
    binary[y + 3] = c << 7 & 128 | bin[en.call($, z + 5)] << 2 | d >> 3 & 7;
    binary[y + 4] = d << 5 & 224 | bin[en.call($, z + 7)];
  }
  return binary;
};
const B32_STR = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
const B32_BIN = /* @__PURE__ */ map(B32_STR, 32);
const H32_STR = "0123456789ABCDEFGHIJKLMNOPQRSTUV";
const H32_BIN = /* @__PURE__ */ map(H32_STR, 32);
const C32_STR = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
const C32_BIN = /* @__PURE__ */ (() => {
  const bin = map(C32_STR, 32);
  for (const $ of "Oo") bin[en.call($)] = 0;
  for (const $ of "IiLl") bin[en.call($)] = 1;
  return bin;
})();
/** Base32 pattern. */
export const B32 = /^[2-7A-Za-z]*$/;
/** Converts binary to base32. */
export const enB32: Encode = /* @__PURE__ */ encode.bind(null, B32_STR);
/** Converts base32 to binary (case-insensitively). */
export const deB32: Decode = /* @__PURE__ */ decode.bind(null, B32_BIN);
/** Base32hex pattern. */
export const H32 = /^[\dA-Va-v]*$/;
/** Converts binary to base32hex. */
export const enH32: Encode = /* @__PURE__ */ encode.bind(null, H32_STR);
/** Converts base32hex to binary (case-insensitively). */
export const deH32: Decode = /* @__PURE__ */ decode.bind(null, H32_BIN);
/** Crockford base32 pattern. */
export const C32 = /^[-^\dA-TV-Za-tv-z]*$/;
/** Converts binary to Crockford base 32. */
export const enC32: Encode = /* @__PURE__ */ encode.bind(null, C32_STR);
/** Converts Crockford base 32 to binary (case-insensitively). */
export const deC32: Decode = ($) => decode(C32_BIN, $.replace(/-+/g, ""));
