import { en } from "./utf8.ts";

/** Binary-to-string function. */
export type Encode = (binary: Uint8Array) => string;
/** String-to-binary function. */
export type Decode = (string: string) => Uint8Array<ArrayBuffer>;
/** Creates a code-to-byte map. */
export const map = ($: string, or?: number): Uint8Array<ArrayBuffer> => {
  const bin = new Uint8Array(256);
  for (let z = 0; z < $.length; ++z) {
    bin[en.call($, z)] = z;
    if (or) bin[en.call($, z) | or] = z;
  }
  return bin;
};
/** Converts binary to a radix-32 string. */
export const en32 = (str: string, $: Uint8Array): string => {
  let string = "";
  for (let z = 0; z < $.length; z += 5) {
    const a = $[z], b = $[z + 1], c = $[z + 2], d = $[z + 3], e = $[z + 4];
    string += str[a >> 3] + str[a << 2 & 28 | b >> 6] + str[b >> 1 & 31] +
      str[b << 4 & 16 | c >> 4] + str[c << 1 & 30 | d >> 7] + str[d >> 2 & 31] +
      str[d << 3 & 24 | e >> 5] + str[e & 31];
  }
  return string.slice(0, Math.ceil($.length / 5 * 8));
};
/** Converts a radix-32 string to binary. */
export const de32 = (bin: Uint8Array, $: string): Uint8Array<ArrayBuffer> => {
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
/** Converts a radix-64 string to binary. */
export const de64 = (bin: Uint8Array, $: string) => {
  const binary = new Uint8Array($.length * 3 >> 2);
  for (let z = 0, y = 0; z < $.length; z += 4, y += 3) {
    const a = bin[en.call($, z + 1)], b = bin[en.call($, z + 2)];
    binary[y] = bin[en.call($, z)] << 2 | a >> 4;
    binary[y + 1] = a << 4 | b >> 2;
    binary[y + 2] = b << 6 | bin[en.call($, z + 3)];
  }
  return binary;
};
const enum Step {
  A = 85 ** 4,
  B = 85 ** 3,
  C = 85 ** 2,
  D = 85 ** 1,
}
/** Converts binary to a radix-85 string. */
export const en85 = (str: string, $: Uint8Array): string => {
  let string = "";
  for (let z = 0; z < $.length; z += 4) {
    const a = ($[z] << 24 | $[z + 1] << 16 | $[z + 2] << 8 | $[z + 3]) >>> 0;
    string += str[a / Step.A % 85 | 0] + str[a / Step.B % 85 | 0] +
      str[a / Step.C % 85 | 0] + str[a / Step.D % 85 | 0] + str[a % 85];
  }
  return string;
};
/** Converts a radix-85 string to binary. */
export const de85 = (bin: Uint8Array, $: string): Uint8Array<ArrayBuffer> => {
  const binary = new Uint8Array(Math.ceil($.length / 5 * 4));
  for (let z = 0, y = 0; z < $.length; z += 5, y += 4) {
    const a = binary[y + 3] = bin[en.call($, z)] * Step.A +
      bin[en.call($, z + 1)] * Step.B + bin[en.call($, z + 2)] * Step.C +
      bin[en.call($, z + 3)] * Step.D + bin[en.call($, z + 4)];
    binary[y] = a >> 24, binary[y + 1] = a >> 16, binary[y + 2] = a >> 8;
  }
  return binary;
};
