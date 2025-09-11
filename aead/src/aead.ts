import { chacha, hchacha } from "./chacha.ts";
import { poly } from "./poly.ts";

const crypt = (key: DataView, iv: DataView, $: Uint8Array, start = 1) => {
  // `iv0` (first 4 bytes) is a constant `0`.
  const iv1 = iv.getUint32(16, true), iv2 = iv.getUint32(20, true);
  const state = new Uint32Array(16), most = $.length & ~63;
  let a = new DataView($.buffer, $.byteOffset), z = 0, y = start;
  while (z < most) {
    chacha(key, y++, 0, iv1, iv2, state);
    a.setUint32(z, a.getUint32(z, true) ^ state[0], true);
    a.setUint32(z + 4, a.getUint32(z + 4, true) ^ state[1], true);
    a.setUint32(z + 8, a.getUint32(z + 8, true) ^ state[2], true);
    a.setUint32(z + 12, a.getUint32(z + 12, true) ^ state[3], true);
    a.setUint32(z + 16, a.getUint32(z + 16, true) ^ state[4], true);
    a.setUint32(z + 20, a.getUint32(z + 20, true) ^ state[5], true);
    a.setUint32(z + 24, a.getUint32(z + 24, true) ^ state[6], true);
    a.setUint32(z + 28, a.getUint32(z + 28, true) ^ state[7], true);
    a.setUint32(z + 32, a.getUint32(z + 32, true) ^ state[8], true);
    a.setUint32(z + 36, a.getUint32(z + 36, true) ^ state[9], true);
    a.setUint32(z + 40, a.getUint32(z + 40, true) ^ state[10], true);
    a.setUint32(z + 44, a.getUint32(z + 44, true) ^ state[11], true);
    a.setUint32(z + 48, a.getUint32(z + 48, true) ^ state[12], true);
    a.setUint32(z + 52, a.getUint32(z + 52, true) ^ state[13], true);
    a.setUint32(z + 56, a.getUint32(z + 56, true) ^ state[14], true);
    a.setUint32(z + 60, a.getUint32(z + 60, true) ^ state[15], true), z += 64;
  }
  if (most < $.length) {
    chacha(key, y, y = 0, iv1, iv2, state), a = new DataView(state.buffer);
    do $[z] ^= a.getUint8(y++); while (++z < $.length);
  }
};
const mac = (key: Uint32Array, ciphertext: Uint8Array, data: Uint8Array) => {
  const a = data.length + 15 & ~15, b = ciphertext.length + a + 15 & ~15;
  const message = new Uint8Array(b + 16), view = new DataView(message.buffer);
  message.set(data), view.setUint32(b, data.length, true);
  message.set(ciphertext, a), view.setUint32(b + 8, ciphertext.length, true);
  return poly(new DataView(key.buffer), message);
};
const UNUSED = new Uint32Array(32);
/** XORs the text in-place without checking parameters. */
export const xor = (key: Uint8Array, iv: Uint8Array, $: Uint8Array): void => {
  const a = new DataView(iv.buffer, iv.byteOffset);
  crypt(hchacha(new DataView(key.buffer, key.byteOffset), a, UNUSED), a, $, 0);
};
/** If parameters are valid, XORs the plaintext in-place, then returns a tag. */
export const xchachapoly = (
  key: Uint8Array,
  iv: Uint8Array,
  plaintext: Uint8Array,
  associated_data: Uint8Array,
): Uint8Array | void => {
  if (key.length !== 32 || iv.length !== 24) return;
  const a = new DataView(iv.buffer, iv.byteOffset);
  const mac_key = new Uint32Array(16);
  const xor_key = hchacha(new DataView(key.buffer, key.byteOffset), a, mac_key);
  chacha(xor_key, 0, 0, a.getUint32(16, true), a.getUint32(20, true), mac_key);
  return crypt(xor_key, a, plaintext), mac(mac_key, plaintext, associated_data);
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
  const a = new DataView(iv.buffer, iv.byteOffset);
  const mac_key = new Uint32Array(16);
  const xor_key = hchacha(new DataView(key.buffer, key.byteOffset), a, mac_key);
  chacha(xor_key, 0, 0, a.getUint32(16, true), a.getUint32(20, true), mac_key);
  const calculated_tag = mac(mac_key, ciphertext, associated_data);
  let is_different = 0, z = 16;
  do is_different |= tag[--z] ^ calculated_tag[z]; while (z);
  return !is_different && (crypt(xor_key, a, ciphertext), true);
};
