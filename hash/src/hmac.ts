import { sha256 } from "./sha2.ts";

const OPAD = new Uint8Array(96);
/** Creates a hash-based message authentication code with SHA-256. */
export const hmac_sha256 = (
  key: Uint8Array,
  data: Uint8Array,
): Uint8Array<ArrayBuffer> => {
  if (key.length > 64) key = sha256(key);
  const size = key.length + 63 & ~63, ipad = new Uint8Array(size + data.length);
  let z = size;
  do ipad[--z] = 54 ^ key[z], OPAD[z] = 92 ^ key[z]; while (z);
  ipad.set(data, size), OPAD.set(sha256(ipad), size);
  return sha256(OPAD.subarray(0, size + 32));
};
const SALT = new Uint8Array(32), DATA = new Uint8Array(8160);
/** Derives a key with HMAC-SHA256. */
export const hkdf_sha256 = (
  key: Uint8Array,
  info: Uint8Array = new Uint8Array(),
  salt: Uint8Array = new Uint8Array(32),
  length = 32,
): Uint8Array<ArrayBuffer> => {
  if (length < 1 || length > 8160) return new Uint8Array();
  if (salt.length < 32) SALT.fill(0).set(salt), salt = SALT;
  const use = info.length + 32, to = new Uint8Array(use + 1);
  to.set(info, 32), to[use] = 1;
  DATA.set(salt = hmac_sha256(key = hmac_sha256(salt, key), to.subarray(32)));
  for (let parts = length + 31 >> 5, z = 0; ++z < parts;) {
    to.set(salt), ++to[use], DATA.set(salt = hmac_sha256(key, to), z << 5);
  }
  return new Uint8Array(DATA.subarray(0, length));
};
