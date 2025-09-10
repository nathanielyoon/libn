/**
 * XChaCha20-Poly1305 ([RFC 8439](https://www.rfc-editor.org/rfc/rfc8439) and
 * [draft-irtf-cfrg-xchacha-03](https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-xchacha-03)).
 *
 * @example Authenticated encryption
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 *
 * const key = crypto.getRandomValues(new Uint8Array(32));
 * const message = crypto.getRandomValues(new Uint8Array(100));
 *
 * const secret = encrypt(key, message);
 * assert(secret);
 * assertEquals(decrypt(key, secret), message);
 * ```
 *
 * @example Authenticated encryption with associated data
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 *
 * const key = crypto.getRandomValues(new Uint8Array(32));
 * const message = crypto.getRandomValues(new Uint8Array(100));
 * const data = crypto.getRandomValues(new Uint8Array(100));
 *
 * const secret = encrypt(key, message, data);
 * assert(secret);
 * assertEquals(decrypt(key, secret, data), message);
 * assertEquals(decrypt(key, secret), null);
 * ```
 *
 * @module aead
 */

import { polyxchacha, xchachapoly } from "./src/aead.ts";

/** Encrypts with XChaCha20-Poly1305. */
export const encrypt = (
  key: Uint8Array,
  plaintext: Uint8Array,
  additional_data: Uint8Array = new Uint8Array(),
): Uint8Array<ArrayBuffer> | null => {
  const iv = crypto.getRandomValues(new Uint8Array(24));
  const ciphertext_tag = xchachapoly(key, iv, plaintext, additional_data);
  if (!ciphertext_tag) return ciphertext_tag;
  const iv_ciphertext_tag = new Uint8Array(ciphertext_tag.length + 24);
  iv_ciphertext_tag.set(iv), iv_ciphertext_tag.set(ciphertext_tag, 24);
  return iv_ciphertext_tag;
};
/** Decrypts with XChaCha20-Poly1305. */
export const decrypt = (
  key: Uint8Array,
  iv_ciphertext_tag: Uint8Array,
  additional_data: Uint8Array = new Uint8Array(),
): Uint8Array<ArrayBuffer> | null =>
  polyxchacha(
    key,
    iv_ciphertext_tag.subarray(0, 24),
    iv_ciphertext_tag.subarray(24),
    additional_data,
  );
