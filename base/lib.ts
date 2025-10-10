/** Binary-to-string function. */
export type Encode = ($: Uint8Array) => string;
/** String-to-binary function. */
export type Decode = ($: string) => Uint8Array<ArrayBuffer>;
/** Character code getter. */
export const en: (this: string, index: number) => number =
  /* @__PURE__ */ (() => String.prototype.charCodeAt)();
/** Character code setter. */
export const de: (...codes: number[]) => string =
  /* @__PURE__ */ (() => String.fromCharCode)();
/** Creates a code-to-byte map. */
export const map = ($: string, or?: number): Uint8Array<ArrayBuffer> => {
  const bin = new Uint8Array(256);
  for (let z = 0; z < $.length; ++z) {
    bin[en.call($, z)] = z;
    if (or) bin[en.call($, z) | or] = z;
  }
  return bin;
};
