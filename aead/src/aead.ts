import { chacha, hchacha } from "./chacha.ts";
import { poly } from "./poly.ts";

const xor = (key: DataView, iv: DataView, $: Uint8Array, to: Uint8Array) => {
  const a = $.length & ~63, b = new DataView($.buffer, $.byteOffset);
  const c = iv.getUint32(16, true), d = iv.getUint32(20, true);
  const e = new Uint32Array(16);
  let f = new DataView(to.buffer, to.byteOffset), z = 0, y = 1;
  while (z < a) {
    chacha(key, y++, 0, c, d, e);
    f.setUint32(z, b.getUint32(z, true) ^ e[0], true);
    f.setUint32(z + 4, b.getUint32(z + 4, true) ^ e[1], true);
    f.setUint32(z + 8, b.getUint32(z + 8, true) ^ e[2], true);
    f.setUint32(z + 12, b.getUint32(z + 12, true) ^ e[3], true);
    f.setUint32(z + 16, b.getUint32(z + 16, true) ^ e[4], true);
    f.setUint32(z + 20, b.getUint32(z + 20, true) ^ e[5], true);
    f.setUint32(z + 24, b.getUint32(z + 24, true) ^ e[6], true);
    f.setUint32(z + 28, b.getUint32(z + 28, true) ^ e[7], true);
    f.setUint32(z + 32, b.getUint32(z + 32, true) ^ e[8], true);
    f.setUint32(z + 36, b.getUint32(z + 36, true) ^ e[9], true);
    f.setUint32(z + 40, b.getUint32(z + 40, true) ^ e[10], true);
    f.setUint32(z + 44, b.getUint32(z + 44, true) ^ e[11], true);
    f.setUint32(z + 48, b.getUint32(z + 48, true) ^ e[12], true);
    f.setUint32(z + 52, b.getUint32(z + 52, true) ^ e[13], true);
    f.setUint32(z + 56, b.getUint32(z + 56, true) ^ e[14], true);
    f.setUint32(z + 60, b.getUint32(z + 60, true) ^ e[15], true), z += 64;
  }
  if (a < $.length) {
    chacha(key, y, y = 0, c, d, e), f = new DataView(e.buffer);
    do to[z] = $[z] ^ f.getUint8(y++); while (++z < $.length);
  }
};
const tag = (key: Uint32Array, $: Uint8Array, data: Uint8Array) => {
  const a = new DataView(key.buffer), b = data.length, c = $.length;
  const d = b + 15 & ~15, e = c + d + 15 & ~15, f = new Uint8Array(e + 16);
  f.set(data), f.set($, d), f[e] = b, f[e + 1] = b >> 8, f[e + 2] = b >> 16;
  f[e + 3] = b >> 24, f[e + 8] = c, f[e + 9] = c >> 8, f[e + 10] = c >> 16;
  return f[e + 11] = c >> 24, poly(a, f);
};
/** Authenticated encryption. */
export const xchachapoly = (
  key: Uint8Array,
  iv: Uint8Array,
  $: Uint8Array,
  data: Uint8Array,
): null | Uint8Array<ArrayBuffer> => {
  if (key.length !== 32 || iv.length !== 24) return null;
  const a = new DataView(iv.buffer, iv.byteOffset), b = new Uint32Array(16);
  const c = hchacha(new DataView(key.buffer, key.byteOffset), a, b);
  chacha(c, 0, 0, a.getUint32(16, true), a.getUint32(20, true), b);
  const d = $.length, e = new Uint8Array(d + 16);
  return xor(c, a, $, e), e.set(tag(b, e.subarray(0, d), data), d), e;
};
/** Authenticated decryption. */
export const polyxchacha = (
  key: Uint8Array,
  iv: Uint8Array,
  $: Uint8Array,
  data: Uint8Array,
): null | Uint8Array<ArrayBuffer> => {
  if (key.length !== 32 || iv.length !== 24) return null;
  const a = new DataView(iv.buffer, iv.byteOffset), b = new Uint32Array(16);
  const c = hchacha(new DataView(key.buffer, key.byteOffset), a, b);
  chacha(c, 0, 0, a.getUint32(16, true), a.getUint32(20, true), b);
  const d = $.length - 16, e = new Uint8Array(d);
  const f = tag(b, $.subarray(0, d), data);
  let z = 16, y = 0;
  do y |= f[--z] ^ $[d + z]; while (z);
  return y ? null : (xor(c, a, $.subarray(0, d), e), e);
};
