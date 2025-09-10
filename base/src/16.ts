import { map } from "./map.ts";

const BIN = /* @__PURE__ */ map("0123456789abcdef");
const STR = /* @__PURE__ */ Array.from(
  { length: 256 },
  (_, byte) => byte.toString(16).padStart(2, "0"),
);
/** Encodes binary -> base16 string. */
export const en_b16 = ($: Uint8Array): string => {
  let string = "";
  for (let z = 0; z < $.length; ++z) string += STR[$[z]];
  return string;
};
/** Decodes base16 string -> binary. */
export const de_b16 = ($: string): Uint8Array<ArrayBuffer> => {
  const binary = new Uint8Array($.length >> 1);
  for (let z = 0; z < $.length;) {
    binary[z >> 1] = BIN[$.charCodeAt(z++)] << 4 | BIN[$.charCodeAt(z++)];
  }
  return binary;
};
