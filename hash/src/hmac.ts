import { sha256 } from "./sha2.ts";

/** Creates a hash-based message authentication code with SHA-256. */
export const hmac_sha256 = (
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
/** Derives a key with HMAC-SHA256. */
export const hkdf_sha256 = (
  key: Uint8Array,
  info: Uint8Array = new Uint8Array(),
  salt: Uint8Array = new Uint8Array(32),
  length = 32,
): Uint8Array<ArrayBuffer> => {
  if (length < 1 || length > 255 << 5) return new Uint8Array();
  const size = info.length + 32, parts = length + 31 >> 5;
  let temp, z = 1;
  if (salt.length < 32) temp = new Uint8Array(32), temp.set(salt), salt = temp;
  const extracted = hmac_sha256(salt, key), to = new Uint8Array(size + 1);
  to.set(info, 32), to[size] = 1;
  const output = new Uint8Array(parts << 5);
  for (
    output.set(temp = hmac_sha256(extracted, to.subarray(32)));
    z < parts;
    ++z
  ) {
    to.set(temp),
      ++to[size],
      output.set(temp = hmac_sha256(extracted, to), z << 5);
  }
  return new Uint8Array(output.subarray(0, length));
};
