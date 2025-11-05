/** @module b64 */
import { de64, type Decode, type Encode, map } from "./lib.ts";
import { de, en } from "./utf.ts";

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
export const B64: RegExp =
  /^(?:[+/\dA-Za-z]{4})*(?:[+/\dA-Za-z]{2}[+/\d=A-Za-z]=)?$/;
