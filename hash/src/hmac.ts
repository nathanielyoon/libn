import { sha256 } from "./sha2.ts";

/** Creates a hash-based message authentication code. */
export const hmac = (
  key: Uint8Array,
  data: Uint8Array,
): Uint8Array<ArrayBuffer> => {
  if (key.length > 64) key = sha256(key);
  const a = key.length + 63 & ~63, b = new Uint8Array(a + data.length).fill(54);
  const c = new Uint8Array(a + 32).fill(92);
  let z = a;
  do b[--z] ^= key[z], c[z] ^= key[z]; while (z);
  return b.set(data, a), c.set(sha256(b), a), sha256(c);
};
