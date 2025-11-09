import { chacha, hchacha, xor } from "./chacha.ts";
import { poly } from "./poly.ts";

const construct = (ciphertext: Uint8Array, ad: Uint8Array) => {
  const a = ad.length + 15 & ~15, b = ciphertext.length + a + 15 & ~15;
  const full = new Uint8Array(b + 16), view = new DataView(full.buffer);
  full.set(ad), view.setUint32(b, ad.length, true), full.set(ciphertext, a);
  return view.setUint32(b + 8, ciphertext.length, true), full;
};
const ZERO = /* @__PURE__ */ new Uint32Array(16);
/** If parameters are valid, XORs the plaintext in-place, then returns a tag. */
export const xchachaPoly = (
  key: Uint8Array,
  iv: Uint8Array,
  plaintext: Uint8Array,
  ad: Uint8Array,
): null | Uint8Array => {
  if (key.length !== 32 || iv.length !== 24) return null;
  const xorer = hchacha(key, iv);
  const iv0 = iv[16] | iv[17] << 8 | iv[18] << 16 | iv[19] << 24;
  const iv1 = iv[20] | iv[21] << 8 | iv[22] << 16 | iv[23] << 24;
  chacha(xorer, 0, 0, iv0, iv1, ZERO), xor(xorer, 0, iv0, iv1, plaintext, 1);
  return poly(ZERO, construct(plaintext, ad));
};
/** If parameters are valid, checks a tag, then XORs the ciphertext in-place. */
export const polyXchacha = (
  key: Uint8Array,
  iv: Uint8Array,
  tag: Uint8Array,
  ciphertext: Uint8Array,
  ad: Uint8Array,
): null | boolean => {
  if (key.length !== 32 || iv.length !== 24 || tag.length !== 16) return null;
  const xorer = hchacha(key, iv);
  const iv0 = iv[16] | iv[17] << 8 | iv[18] << 16 | iv[19] << 24;
  const iv1 = iv[20] | iv[21] << 8 | iv[22] << 16 | iv[23] << 24;
  chacha(xorer, 0, 0, iv0, iv1, ZERO);
  const calculated = poly(ZERO, construct(ciphertext, ad));
  let diff = 0, z = 16;
  do diff |= tag[--z] ^ calculated[z]; while (z);
  return !diff && (xor(xorer, 0, iv0, iv1, ciphertext, 1), true);
};
