import { chacha, hchacha } from "./chacha.ts";
import { poly } from "./poly.ts";

const xor = (key: DataView, iv: DataView, $: Uint8Array, to: Uint8Array) => {
  // `iv_0` (first 4 bytes) is a constant `0`.
  const iv_1 = iv.getUint32(16, true), iv_2 = iv.getUint32(20, true);
  const state = new Uint32Array(16), a = new DataView($.buffer, $.byteOffset);
  let b = new DataView(to.buffer), z = 0, y = 1;
  const most = $.length & ~63;
  while (z < most) {
    chacha(key, y++, 0, iv_1, iv_2, state);
    b.setUint32(z, a.getUint32(z, true) ^ state[0], true);
    b.setUint32(z + 4, a.getUint32(z + 4, true) ^ state[1], true);
    b.setUint32(z + 8, a.getUint32(z + 8, true) ^ state[2], true);
    b.setUint32(z + 12, a.getUint32(z + 12, true) ^ state[3], true);
    b.setUint32(z + 16, a.getUint32(z + 16, true) ^ state[4], true);
    b.setUint32(z + 20, a.getUint32(z + 20, true) ^ state[5], true);
    b.setUint32(z + 24, a.getUint32(z + 24, true) ^ state[6], true);
    b.setUint32(z + 28, a.getUint32(z + 28, true) ^ state[7], true);
    b.setUint32(z + 32, a.getUint32(z + 32, true) ^ state[8], true);
    b.setUint32(z + 36, a.getUint32(z + 36, true) ^ state[9], true);
    b.setUint32(z + 40, a.getUint32(z + 40, true) ^ state[10], true);
    b.setUint32(z + 44, a.getUint32(z + 44, true) ^ state[11], true);
    b.setUint32(z + 48, a.getUint32(z + 48, true) ^ state[12], true);
    b.setUint32(z + 52, a.getUint32(z + 52, true) ^ state[13], true);
    b.setUint32(z + 56, a.getUint32(z + 56, true) ^ state[14], true);
    b.setUint32(z + 60, a.getUint32(z + 60, true) ^ state[15], true), z += 64;
  }
  if (most < $.length) {
    chacha(key, y, y = 0, iv_1, iv_2, state), b = new DataView(state.buffer);
    do to[z] = $[z] ^ b.getUint8(y++); while (++z < $.length);
  }
};
const tag = (key: Uint32Array, $: Uint8Array, data: Uint8Array) => {
  const a = data.length + 15 & ~15, b = $.length + a + 15 & ~15;
  const message = new Uint8Array(b + 16), view = new DataView(message.buffer);
  view.setUint32(b, data.length, true), view.setUint32(b + 8, $.length, true);
  message.set(data), message.set($, a);
  return poly(new DataView(key.buffer), message);
};
/** Authenticated encryption. */
export const xchachapoly = (
  key: Uint8Array,
  iv: Uint8Array,
  $: Uint8Array,
  data: Uint8Array,
): null | Uint8Array<ArrayBuffer> => {
  if (key.length !== 32 || iv.length !== 24) return null;
  const a = new DataView(iv.buffer, iv.byteOffset);
  const b = new Uint8Array($.length + 16), mac_key = new Uint32Array(16);
  const xor_key = hchacha(new DataView(key.buffer, key.byteOffset), a, mac_key);
  chacha(xor_key, 0, 0, a.getUint32(16, true), a.getUint32(20, true), mac_key);
  xor(xor_key, a, $, b);
  return b.set(tag(mac_key, b.subarray(0, $.length), data), $.length), b;
};
/** Authenticated decryption. */
export const polyxchacha = (
  key: Uint8Array,
  iv: Uint8Array,
  $: Uint8Array,
  data: Uint8Array,
): null | Uint8Array<ArrayBuffer> => {
  if (key.length !== 32 || iv.length !== 24) return null;
  const a = new DataView(iv.buffer, iv.byteOffset), offset = $.length - 16;
  const b = new Uint8Array(offset), mac_key = new Uint32Array(16);
  const xor_key = hchacha(new DataView(key.buffer, key.byteOffset), a, mac_key);
  chacha(xor_key, 0, 0, a.getUint32(16, true), a.getUint32(20, true), mac_key);
  const mac = tag(mac_key, $.subarray(0, offset), data);
  let z = 16, y = 0;
  do y |= mac[--z] ^ $[offset + z]; while (z);
  return y ? null : (xor(xor_key, a, $.subarray(0, offset), b), b);
};
