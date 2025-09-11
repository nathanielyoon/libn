/**
 * Platform-agnostic security tokens ([PASETO](https://paseto.io/)), v4 only.
 *
 * @example Typed keys
 * ```ts
 * import { assert } from "@std/assert";
 *
 * const key = key_local();
 * const { secret_key, public_key } = key_public();
 *
 * assert(is_local(key));
 * assert(is_public(secret_key) && is_public(public_key));
 * ```
 *
 * @example Local encryption and decryption
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 *
 * const key = key_local();
 * const message = crypto.getRandomValues(new Uint8Array(100));
 *
 * const token = en_local(key, message);
 * assert(token);
 * assertEquals(de_local(key, token)?.message, message);
 * ```
 *
 * @example Public signing and verification
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 *
 * const { secret_key, public_key } = key_public();
 * const message = crypto.getRandomValues(new Uint8Array(100));
 *
 * const token = en_public(secret_key, message);
 * assert(token), assertEquals(de_public(public_key, token)?.message, message);
 * ```
 * @module paseto
 */

import {
  is_local,
  is_public,
  key_local,
  key_public,
  type Local,
  type Public,
} from "./src/common.ts";
import { de_local, en_local } from "./src/local.ts";
import { de_public, en_public } from "./src/public.ts";

export {
  de_local,
  de_public,
  en_local,
  en_public,
  is_local,
  is_public,
  key_local,
  key_public,
  type Local,
  type Public,
};
