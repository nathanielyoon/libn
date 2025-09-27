/** Binary-to-text encoder. */
export type Encode = ($: Uint8Array) => string;
/** Text-to-binary decoder. */
export type Decode = ($: string) => Uint8Array<ArrayBuffer>;
/** Creates a case-sensitive code-to-byte map. */
export const map = ($: string): Uint8Array<ArrayBuffer> => {
  const bin = new Uint8Array(256);
  for (let z = 0; z < $.length; ++z) bin[$.charCodeAt(z)] = z;
  return bin;
};
