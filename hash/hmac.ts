import type { Hash } from "./lib.ts";
import { sha256 } from "./sha2.ts";

const enum Size {
  BLOCK = 64,
  DIGEST = 32,
}
const enum Byte {
  INNER = 54,
  OUTER = 92,
}
const OPAD = /* @__PURE__ */ new Uint8Array(96);
/** Creates a hash-based message authentication code with SHA-256. */
export const hmac: Hash<[key: Uint8Array, $: Uint8Array]> = (key, $) => {
  if (key.length > Size.BLOCK) key = sha256(key);
  const size = key.length + Size.BLOCK - 1 & -Size.BLOCK;
  const ipad = new Uint8Array(size + $.length);
  let z = size;
  do ipad[--z] = Byte.INNER ^ key[z], OPAD[z] = Byte.OUTER ^ key[z]; while (z);
  ipad.set($, size), OPAD.set(sha256(ipad), size);
  return sha256(OPAD.subarray(0, size + Size.DIGEST));
};
const SALT = /* @__PURE__ */ new Uint8Array(Size.DIGEST);
const DATA = /* @__PURE__ */ new Uint8Array(8160);
/** Derives a key with HMAC-SHA256. */
export const hkdf: Hash<
  [key: Uint8Array, info?: Uint8Array, salt?: Uint8Array, length?: number]
> = (key, info = new Uint8Array(), salt = SALT, length = 32) => {
  if (length < 1 || length > 8160) return new Uint8Array();
  if (salt.length < Size.DIGEST) SALT.set(salt), salt = SALT;
  const use = info.length + Size.DIGEST, to = new Uint8Array(use + 1);
  to.set(info, Size.DIGEST), to[use] = 1, key = hmac(salt, key);
  DATA.set(salt = hmac(key, to.subarray(Size.DIGEST)));
  for (let parts = length + Size.DIGEST - 1 >> 5, z = 0; ++z < parts;) {
    to.set(salt), ++to[use], DATA.set(salt = hmac(key, to), z << 5);
  }
  const out = new Uint8Array(DATA.subarray(0, length));
  return SALT.fill(0), DATA.fill(0), out;
};
