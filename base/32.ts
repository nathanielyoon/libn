/** @module */
import { type De, type Decode, type En, type Encode, from } from "./lib.ts";

const en32 = (en: En, binary: Uint8Array) => {
  let string = "";
  for (let z = 0; z < binary.length; z += 5) {
    const a = binary[z], b = binary[z + 1], c = binary[z + 2];
    const d = binary[z + 3], e = binary[z + 4];
    string += from(en(a >> 3)) + from(en(a << 2 & 28 | b >> 6)) +
      from(en(b >> 1 & 31)) + from(en(b << 4 & 16 | c >> 4)) +
      from(en(c << 1 & 30 | d >> 7)) + from(en(d >> 2 & 31)) +
      from(en(d << 3 & 24 | e >> 5)) + from(en(e & 31));
  }
  return string.slice(0, Math.ceil(binary.length / 5 * 8));
};
const de32 = (de: De, string: string) => {
  const binary = new Uint8Array(string.length * 5 >> 3);
  for (let z = 0, y = 0; z < string.length; z += 8, y += 5) {
    const a = de(string.charCodeAt(z + 1)), b = de(string.charCodeAt(z + 3));
    const c = de(string.charCodeAt(z + 4)), d = de(string.charCodeAt(z + 6));
    binary[y] = de(string.charCodeAt(z)) << 3 | a >> 2 & 7;
    binary[y + 1] = a << 6 | de(string.charCodeAt(z + 2)) << 1 | b >> 4 & 1;
    binary[y + 2] = b << 4 | c >> 1 & 15;
    binary[y + 3] = c << 7 | de(string.charCodeAt(z + 5)) << 2 | d >> 3 & 7;
    binary[y + 4] = d << 5 | de(string.charCodeAt(z + 7));
  }
  return binary;
};

/** Converts binary to base32. */
export const enB32: Encode = /* @__PURE__ */
  en32.bind(null, ($) => $ + 65 - (25 - $ >> 8 & 41));
/** Converts binary to base32. */
export const deB32: Decode = /* @__PURE__ */
  de32.bind(null, ($) => $ - 65 + ($ - 56 >> 8 & 41));
/** Valid base32. */
export const B32: RegExp = /^[2-7A-Z]*$/;

/** Converts binary to base32hex. */
export const enH32: Encode = /* @__PURE__ */
  en32.bind(null, ($) => $ + 48 + (9 - $ >> 8 & 7));
/** Converts binary to base32hex. */
export const deH32: Decode = /* @__PURE__ */
  de32.bind(null, ($) => $ - 48 - (64 - $ >> 8 & 7));
/** Valid base32hex. */
export const H32: RegExp = /^[\dA-V]*$/;
