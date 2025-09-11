import { hmac } from "./hmac.ts";

/** Derives a key with HMAC-SHA256. */
export const hkdf = (
  key: Uint8Array,
  info: Uint8Array = new Uint8Array(),
  salt: Uint8Array = new Uint8Array(32),
  length = 32,
): Uint8Array<ArrayBuffer> => {
  if (length < 1 || length > 255 << 5) return new Uint8Array();
  const size = info.length + 32, parts = length + 31 >> 5;
  let temp, z = 1;
  if (salt.length < 32) temp = new Uint8Array(32), temp.set(salt), salt = temp;
  const extracted = hmac(salt, key), to = new Uint8Array(size + 1);
  to.set(info, 32), to[size] = 1;
  const output = new Uint8Array(parts << 5);
  for (output.set(temp = hmac(extracted, to.subarray(32))); z < parts; ++z) {
    to.set(temp), ++to[size], output.set(temp = hmac(extracted, to), z << 5);
  }
  return new Uint8Array(output.subarray(0, length));
};
