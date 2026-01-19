/** Bits-to-character function. */
export type En = ($: number) => number;
/** Character-to-bits function. */
export type De = ($: number) => number;
/** Binary-to-string function. */
export type Encode = (binary: Uint8Array) => string;
/** String-to-binary function. */
export type Decode = (string: string) => Uint8Array<ArrayBuffer>;
/** Alias from `String.fromCharCode`, for minification. */
export const from: (code: number) => string =
  /* @__PURE__ */ (() => String.fromCharCode)();
