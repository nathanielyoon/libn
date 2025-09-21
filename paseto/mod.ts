/**
 * Platform-agnostic security tokens ([PASETO](https://paseto.io/)), v4 only.
 *
 * @example Local encryption and decryption
 * ```ts
 * import { assert, assertEquals } from "@std/assert";
 *
 * const key = set_use("local", crypto.getRandomValues(new Uint8Array(32)));
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
 * import { generate } from "@libn/25519";
 *
 * const key = set_use("secret", crypto.getRandomValues(new Uint8Array(32)));
 * const body = crypto.getRandomValues(new Uint8Array(100));
 *
 * const token = en_public(key, body);
 * assert(token);
 * assertEquals(de_public(set_use("public", generate(key)), token)?.body, body);
 * ```
 * @module paseto
 */

import {
  is_local,
  is_public,
  is_secret,
  type Key,
  set_use,
  type Use,
} from "./src/key.ts";
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
  type Key,
  set_use,
  type Use,
};
