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
 * assertEquals(decrypt(key, secret), undefined);
 * ```
 *
 * @module aead
 */

import { polyxchacha, xchachapoly } from "./src/aead.ts";

/** Encrypts with XChaCha20-Poly1305. */
export const encrypt = (
  key: Uint8Array,
  plaintext: Uint8Array,
  associated_data: Uint8Array = new Uint8Array(),
): Uint8Array<ArrayBuffer> | void => {
  const iv = crypto.getRandomValues(new Uint8Array(24));
  const ciphertext = new Uint8Array(plaintext);
  const result = xchachapoly(key, iv, ciphertext, associated_data);
  if (!result) return;
  const out = new Uint8Array(plaintext.length + 40);
  out.set(iv), out.set(result, 24), out.set(ciphertext, 40);
  return out;
};
/** Decrypts with XChaCha20-Poly1305. */
export const decrypt = (
  key: Uint8Array,
  message: Uint8Array,
  associated_data: Uint8Array = new Uint8Array(),
): Uint8Array<ArrayBuffer> | void => {
  const plaintext = new Uint8Array(message.subarray(40));
  if (
    polyxchacha(
      key,
      message.subarray(0, 24),
      message.subarray(24, 40),
      plaintext,
      associated_data,
    )
  ) return plaintext;
};
