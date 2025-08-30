import { polyxchacha, xchachapoly } from "./src/aead.ts";

/** Encrypts with XChaCha20-Poly1305. */
export const encrypt = (
  key: Uint8Array,
  $: Uint8Array,
  data?: Uint8Array,
): Uint8Array<ArrayBuffer> | null => {
  const a = crypto.getRandomValues(new Uint8Array(24));
  const b = xchachapoly(key, a, $, data ?? new Uint8Array());
  if (!b) return b;
  const c = new Uint8Array(b.length + 24);
  return c.set(a), c.set(b, 24), c;
};
/** Decrypts with XChaCha20-Poly1305. */
export const decrypt = (
  key: Uint8Array,
  $: Uint8Array,
  data?: Uint8Array,
): Uint8Array<ArrayBuffer> | null =>
  polyxchacha(key, $.subarray(0, 24), $.subarray(24), data ?? new Uint8Array());
