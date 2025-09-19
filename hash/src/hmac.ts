import { sha256 } from "./sha2.ts";

const enum Size {
  BLOCK = 64,
  DIGEST = 32,
}
const enum Byte {
  INNER = 54,
  OUTER = 92,
}
const OPAD = new Uint8Array(96);
/** Creates a hash-based message authentication code with SHA-256. */
export const hmac_sha256 = (
  key: Uint8Array,
  data: Uint8Array,
): Uint8Array<ArrayBuffer> => {
  if (key.length > Size.BLOCK) key = sha256(key);
  const size = key.length + Size.BLOCK - 1 & -Size.BLOCK;
  const ipad = new Uint8Array(size + data.length);
  let z = size;
  do ipad[--z] = Byte.INNER ^ key[z], OPAD[z] = Byte.OUTER ^ key[z]; while (z);
  ipad.set(data, size), OPAD.set(sha256(ipad), size);
  return sha256(OPAD.subarray(0, size + Size.DIGEST));
};
const SALT = new Uint8Array(Size.DIGEST);
const DATA = new Uint8Array(255 * Size.DIGEST);
/** Derives a key with HMAC-SHA256. */
export const hkdf_sha256 = (
  key: Uint8Array,
  info: Uint8Array = new Uint8Array(),
  salt: Uint8Array = new Uint8Array(Size.DIGEST),
  length = 32,
): Uint8Array<ArrayBuffer> => {
  if (length < 1 || length > DATA.length) return new Uint8Array();
  if (salt.length < Size.DIGEST) SALT.fill(0).set(salt), salt = SALT;
  const use = info.length + Size.DIGEST, to = new Uint8Array(use + 1);
  to.set(info, Size.DIGEST), to[use] = 1, key = hmac_sha256(salt, key);
  DATA.set(salt = hmac_sha256(key, to.subarray(Size.DIGEST)));
  for (let parts = length + Size.DIGEST - 1 >> 5, z = 0; ++z < parts;) {
    to.set(salt), ++to[use], DATA.set(salt = hmac_sha256(key, to), z << 5);
  }
  return new Uint8Array(DATA.subarray(0, length));
};
