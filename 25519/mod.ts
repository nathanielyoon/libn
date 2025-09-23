/**
 * Ed25519 ([RFC 8032](https://www.rfc-editor.org/rfc/rfc8032)) and X25519
 * ([RFC 7748](https://www.rfc-editor.org/rfc/rfc7748)).
 *
 * @example
 * ```ts Key generation, signing, verification
 * import { assert } from "@std/assert";
 *
 * const secret_key = crypto.getRandomValues(new Uint8Array(32));
 * const public_key = generate(secret_key);
 * const data = crypto.getRandomValues(new Uint8Array(32));
 * const signature = sign(secret_key, data);
 * assert(verify(public_key, data, signature));
 * ```
 *
 * @example Key exchange
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * const key_1 = crypto.getRandomValues(new Uint8Array(32));
 * const key_2 = crypto.getRandomValues(new Uint8Array(32));
 * assertEquals(exchange(key_1, derive(key_2)), exchange(key_2, derive(key_1)));
 * assertEquals(exchange(key_1, new Uint8Array(32)), null);
 * ```
 *
 * @example Key exchange with converted Edwards keys
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * const key_1 = crypto.getRandomValues(new Uint8Array(32));
 * const key_2 = crypto.getRandomValues(new Uint8Array(32));
 * assertEquals(
 *   exchange(convert_secret(key_1), convert_public(generate(key_2))),
 *   exchange(convert_secret(key_2), convert_public(generate(key_1))),
 * );
 * ```
 *
 * @module curve25519
 */

import { generate, sign, verify } from "./src/ed25519.ts";
import {
  convert_public,
  convert_secret,
  derive,
  exchange,
} from "./src/x25519.ts";

export {
  convert_public,
  convert_secret,
  derive,
  exchange,
  generate,
  sign,
  verify,
};
