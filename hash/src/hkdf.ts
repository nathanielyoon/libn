import { hmac } from "./hmac.ts";

/** Derives a key with HMAC. */
export const hkdf = (
  key: Uint8Array,
  info: Uint8Array = new Uint8Array(),
  salt: Uint8Array = new Uint8Array(32),
  out = 32,
): Uint8Array<ArrayBuffer> => {
  if (out < 1 || out > 255 << 5) return new Uint8Array();
  let a;
  if (salt.length < 32) a = new Uint8Array(32), a.set(salt), salt = a;
  const b = hmac(salt, key), c = Math.ceil(out / 32), d = info.length + 32;
  const e = new Uint8Array(d + 1), f = new Uint8Array(c << 5);
  e.set(info, 32), e[d] = 1, f.set(a = hmac(b, e.subarray(32)));
  for (let z = 1; z < c; ++z) e.set(a), ++e[d], f.set(a = hmac(b, e), z << 5);
  return new Uint8Array(f.subarray(0, out));
};
