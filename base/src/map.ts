/** Creates a code-to-byte map. */
export const map = ($: string) => {
  const bin = new Uint8Array(256);
  for (let char, z = 0; z < 32; ++z) {
    bin[char = $.charCodeAt(z) | 32] = bin[char & 95] = z;
  }
  return bin;
};
