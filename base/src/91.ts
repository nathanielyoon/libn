import { type Decode, type Encode, map } from "./common.ts";

const STR =
  'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!#$%&()*+,./:;<=>?@[]^_`{|}~"';
const BIN = /* @__PURE__ */ map(STR);
/** Encodes binary -> base91 string. */
export const en_b91: Encode = ($: Uint8Array): string => {
  let string = "", temp = 0, carry = 0;
  for (let z = 0, word, bit; z < $.length; ++z) {
    temp |= $[z] << carry, carry += 8;
    if (carry > 13) {
      if ((word = temp & 0x1fff) > 88) bit = 13;
      else word |= temp & 0x2000, bit = 14;
      temp >>= bit, carry -= bit, string += STR[word % 91] + STR[word / 91 | 0];
    }
  }
  if (carry > 7 || temp > 90) string += STR[temp % 91] + STR[temp / 91 | 0];
  else if (carry) string += STR[temp % 91];
  return string;
};
/** Decodes base91 string -> binary. */
export const de_b91: Decode = ($: string): Uint8Array<ArrayBuffer> => {
  const max = $.length & ~1, binary = new Uint8Array($.length << 1);
  let temp = 0, carry = 0, z = 0, y = 0;
  while (z < max) {
    const word = BIN[$.charCodeAt(z++)] + 91 * BIN[$.charCodeAt(z++)];
    temp |= word << carry, carry += (word & 0x1fff) > 88 ? 13 : 14;
    do binary[y++] = temp, temp >>= 8, carry -= 8; while (carry > 7);
  }
  if ($.length > max) binary[y++] = temp | BIN[$.charCodeAt(max)] << carry;
  return new Uint8Array(binary.subarray(0, y));
};
