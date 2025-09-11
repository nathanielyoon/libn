import { sha256 } from "./sha2.ts";

/** Creates a hash-based message authentication code with SHA-256. */
export const hmac = (
  key: Uint8Array,
  data: Uint8Array,
): Uint8Array<ArrayBuffer> => {
  if (key.length > 64) key = sha256(key);
  const size = key.length + 63 & ~63;
  const ipad = new Uint8Array(size + data.length).fill(54, 0, size);
  const opad = new Uint8Array(size + 32).fill(92, 0, size);
  let z = size;
  do ipad[--z] ^= key[z], opad[z] ^= key[z]; while (z);
  ipad.set(data, size), opad.set(sha256(ipad), size);
  return sha256(opad);
};
