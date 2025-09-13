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
 * assertEquals(x25519(key_1, x25519(key_2)), x25519(key_2, x25519(key_1)));
 * ```ts
 *
 * @example Key exchange with converted Edwards keys
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * const key_1 = crypto.getRandomValues(new Uint8Array(32));
 * const key_2 = crypto.getRandomValues(new Uint8Array(32));
 * assertEquals(
 *   x25519(convert_secret(key_1), convert_public(generate(key_2))),
 *   x25519(convert_secret(key_2), convert_public(generate(key_1))),
 * );
 * ```ts
 *
 * @module curve25519
 */

import { generate, sign, verify } from "./src/ed25519.ts";
import { convert_public, convert_secret, x25519 } from "./src/x25519.ts";

export { convert_public, convert_secret, generate, sign, verify, x25519 };
