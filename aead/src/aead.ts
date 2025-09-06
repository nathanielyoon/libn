import { chacha, hchacha } from "./chacha.ts";
import { poly } from "./poly.ts";

const xor = (key: DataView, iv: DataView, $: Uint8Array, to: Uint8Array) => {
  const a = iv.getUint32(16, true), b = iv.getUint32(20, true);
  const c = $.length & ~63, d = new Uint32Array(16);
  let e = new DataView(to.buffer, to.byteOffset), z = 0, y = 1, x;
  while (z < c) {
    chacha(key, y++, x = 0, a, b, d);
    do e.setUint32(
      z,
      ($[z++] | $[z++] << 8 | $[z++] << 16 | $[z++] << 24) ^ d[x],
      true,
    ); while (++x < 16);
  }
  if (c < $.length) {
    chacha(key, y, x = 0, a, b, d), e = new DataView(d.buffer);
    do to[z] = $[z] ^ e.getUint8(x++); while (++z < $.length);
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
