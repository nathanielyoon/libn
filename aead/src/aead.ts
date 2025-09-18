import { chacha, hchacha, stream } from "./chacha.ts";
import { poly } from "./poly.ts";

const message = (ciphertext: Uint8Array, additional: Uint8Array) => {
  const a = additional.length + 15 & ~15, b = ciphertext.length + a + 15 & ~15;
  const full = new Uint8Array(b + 16), view = new DataView(full.buffer);
  full.set(additional), view.setUint32(b, additional.length, true);
  full.set(ciphertext, a), view.setUint32(b + 8, ciphertext.length, true);
  return full;
};
const ZERO = new Uint32Array(16);
/** If parameters are valid, XORs the plaintext in-place, then returns a tag. */
export const xchachapoly = (
  key: Uint8Array,
  iv: Uint8Array,
  plaintext: Uint8Array,
  associated_data: Uint8Array,
): null | Uint8Array => {
  if (key.length !== 32 || iv.length !== 24) return null;
  const xorer = hchacha(key, iv);
  const iv0 = iv[16] | iv[17] << 8 | iv[18] << 16 | iv[19] << 24;
  const iv1 = iv[20] | iv[21] << 8 | iv[22] << 16 | iv[23] << 24;
  chacha(xorer, 0, 0, iv0, iv1, ZERO), stream(xorer, 0, iv0, iv1, plaintext, 1);
  return poly(ZERO, message(plaintext, associated_data));
};
/** If parameters are valid, checks a tag, then XORs the ciphertext in-place. */
export const polyxchacha = (
  key: Uint8Array,
  iv: Uint8Array,
  tag: Uint8Array,
  ciphertext: Uint8Array,
  associated_data: Uint8Array,
): boolean => {
  if (key.length !== 32 || iv.length !== 24 || tag.length !== 16) return false;
  const xorer = hchacha(key, iv);
  const iv0 = iv[16] | iv[17] << 8 | iv[18] << 16 | iv[19] << 24;
  const iv1 = iv[20] | iv[21] << 8 | iv[22] << 16 | iv[23] << 24;
  chacha(xorer, 0, 0, iv0, iv1, ZERO);
  const calculated_tag = poly(ZERO, message(ciphertext, associated_data));
  let is_different = 0, z = 16;
  do is_different |= tag[--z] ^ calculated_tag[z]; while (z);
  return !is_different && (stream(xorer, 0, iv0, iv1, ciphertext, 1), true);
};
