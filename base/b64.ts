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
/** Decodable base64. */
export const B64 = /^(?:[+/\dA-Za-z]{4})*(?:[+/\dA-Za-z]{2}[+/\d=A-Za-z]=)?$/;
