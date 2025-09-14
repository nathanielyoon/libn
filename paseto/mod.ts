/**
 * Platform-agnostic security tokens ([PASETO](https://paseto.io/)), v4 only.
 *
 * @example Typed keys
 * ```ts
 * import { assert } from "@std/assert";
 *
 * const key = make_local();
 * const { secret_key, public_key } = make_public();
 *
 * assert(is_local(key));
 * assert(is_secret(secret_key) && is_public(public_key));
 * ```
 *
 * @example Local encryption and decryption
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 *
 * const key = make_local();
 * const body = crypto.getRandomValues(new Uint8Array(100));
 *
 * const token = en_local(key, body);
 * assert(token);
 * assertEquals(de_local(key, token)?.body, body);
 * ```
 *
 * @example Public signing and verification
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 *
 * const { secret_key, public_key } = make_public();
 * const body = crypto.getRandomValues(new Uint8Array(100));
 *
 * const token = en_public(secret_key, body);
 * assert(token), assertEquals(de_public(public_key, token)?.body, body);
 * ```
 * @module paseto
 */

import {
  is_local,
  is_public,
  is_secret,
  make_local,
  make_public,
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
  is_secret,
  make_local,
  make_public,
};
