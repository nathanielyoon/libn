/** @module b58 */
import { type Decode, type Encode, map } from "./lib.ts";
import { en } from "./utf.ts";

const B58_STR = "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz";
const B58_BIN = /* @__PURE__ */ map(B58_STR);
/** Converts binary to base58. */
export const enB58: Encode = ($) => {
  let length = 0, string = "", z = 0;
  while ($[z] === 0) string += "1", ++z;
  const size = $.length * 1.38 + 1 | 0, temp = new Uint8Array(size);
  for (let carry, y, x; z < $.length; length = y, ++z) {
    carry = $[z], y = 0, x = size;
    do carry += temp[--x] << 8,
      temp[x] = carry % 58,
      carry = carry / 58 | 0; while ((++y < length || carry) && x);
  }
  for (z = size - length; z < size; ++z) string += B58_STR[temp[z]];
  return string;
};
/** Converts base58 to binary. */
export const deB58: Decode = ($) => {
  let length = 0, zeroes = 0, z = 0;
  while (en.call($, z) === 49) ++z, ++zeroes;
  const size = $.length * .733 + 1 | 0, temp = new Uint8Array(size);
  for (let carry, y, x; z < $.length; length = y, ++z) {
    carry = B58_BIN[en.call($, z)], y = 0, x = size;
    do carry += temp[--x] * 58, temp[x] = carry, carry >>= 8; while (
      (++y < length || carry) && x
    );
  }
  const binary = new Uint8Array(zeroes + length);
  for (z = size - length; z < size; ++zeroes, ++z) binary[zeroes] = temp[z];
  return binary;
};
/** Decodable base58. */
export const B58 = /^[1-9A-HJ-NP-Za-km-z]*$/;
