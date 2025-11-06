/** @module hmac */
import type { Hash } from "./lib.ts";
import { sha256 } from "@libn/hash/sha2";

const OPAD = /* @__PURE__ */ new Uint8Array(96);
/** Creates a hash-based message authentication code with SHA-256. */
export const hmac: Hash<[key: Uint8Array, $: Uint8Array]> = (key, $) => {
  if (key.length > 64) key = sha256(key);
  const size = key.length + 63 & ~63, ipad = new Uint8Array(size + $.length);
  let z = size;
  do ipad[--z] = 54 ^ key[z], OPAD[z] = 92 ^ key[z]; while (z);
  ipad.set($, size), OPAD.set(sha256(ipad), size);
  return sha256(OPAD.subarray(0, size + 32));
};
const SALT = /* @__PURE__ */ new Uint8Array(32);
const DATA = /* @__PURE__ */ new Uint8Array(8160);
/** Derives a key with HMAC-SHA256. */
export const hkdf: Hash<
  [key: Uint8Array, info?: Uint8Array, salt?: Uint8Array, length?: number]
> = (key, info = new Uint8Array(), salt = SALT, length = 32) => {
  if (length < 1 || length > 8160) return new Uint8Array();
  if (salt.length < 32) SALT.set(salt), salt = SALT;
  const use = info.length + 32, to = new Uint8Array(use + 1);
  to.set(info, 32), to[use] = 1, key = hmac(salt, key);
  DATA.set(salt = hmac(key, to.subarray(32)));
  for (let parts = length + 31 >> 5, z = 0; ++z < parts;) {
    to.set(salt), ++to[use], DATA.set(salt = hmac(key, to), z << 5);
  }
  const out = new Uint8Array(DATA.subarray(0, length));
  return SALT.fill(0), DATA.fill(0), out;
};
