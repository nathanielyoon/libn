/**
 * XChaCha20-Poly1305 authenticated encryption and XChaCha20 stream cipher.
 *
 * @example Authenticated encryption
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 *
 * const key = crypto.getRandomValues(new Uint8Array(32));
 * const message = crypto.getRandomValues(new Uint8Array(100));
 * const data = crypto.getRandomValues(new Uint8Array(100));
 *
 * // Encrypt!
 * const secret = encrypt(key, message, data);
 * assert(secret);
 *
 * // Decrypt!
 * assertEquals(decrypt(key, secret, data), message);
 * assertEquals(decrypt(key, secret), null);
 * ```
 *
 * @example Stream cipher
 * ```ts
 * import { assertEquals, assertNotEquals } from "@std/assert";
 *
 * const key = crypto.getRandomValues(new Uint8Array(32));
 * const iv = crypto.getRandomValues(new Uint8Array(24));
 * const plaintext = crypto.getRandomValues(new Uint8Array(100));
 * const ciphertext = new Uint8Array(plaintext);
 *
 * // Encrypt!
 * cipher(key, iv, ciphertext);
 * assertNotEquals(ciphertext, plaintext);
 *
 * // Decrypt!
 * cipher(key, iv, ciphertext);
 * assertEquals(ciphertext, plaintext);
 * ```
 *
 * @module aead
 */

import { hchacha, xor } from "./chacha.ts";
import { polyXchacha, xchachaPoly } from "./xchachapoly.ts";

/** Encrypts with XChaCha20-Poly1305. */
export const encrypt = (
  key: Uint8Array,
  plaintext: Uint8Array,
  associated_data: Uint8Array = new Uint8Array(),
): null | Uint8Array<ArrayBuffer> => {
  const iv = crypto.getRandomValues(new Uint8Array(24));
  const ciphertext = new Uint8Array(plaintext);
  const result = xchachaPoly(key, iv, ciphertext, associated_data);
  if (!result) return null;
  const out = new Uint8Array(ciphertext.length + 40);
  out.set(iv), out.set(result, 24), out.set(ciphertext, 40);
  return out;
};
/** Decrypts with XChaCha20-Poly1305. */
export const decrypt = (
  key: Uint8Array,
  message: Uint8Array,
  associated_data: Uint8Array = new Uint8Array(),
): null | Uint8Array<ArrayBuffer> => {
  if (message.length < 40) return null;
  const iv = message.subarray(0, 24), tag = message.subarray(24, 40);
  const text = new Uint8Array(message.subarray(40));
  return polyXchacha(key, iv, tag, text, associated_data) ? text : null;
};
/** XORs the text in-place (without checking parameters). */
export const cipher = (key: Uint8Array, iv: Uint8Array, $: Uint8Array): void =>
  xor(
    hchacha(key, iv),
    0,
    iv[16] | iv[17] << 8 | iv[18] << 16 | iv[19] << 24,
    iv[20] | iv[21] << 8 | iv[22] << 16 | iv[23] << 24,
    $,
    0,
  );
