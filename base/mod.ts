/**
 * Base16, base32, base32hex, base64, and base64url
 * ([RFC 4648](https://www.rfc-editor.org/rfc/rfc4648)), and some
 * [base-32 variants](https://en.wikipedia.org/wiki/Base32#Alternative_encoding_schemes).
 *
 * @example RFC4648 schemes
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * const data = crypto.getRandomValues(new Uint8Array(100));
 *
 * assertEquals(de_b16(en_b16(data)), data);
 * assertEquals(de_b32(en_b32(data)), data);
 * assertEquals(de_h32(en_h32(data)), data);
 * assertEquals(de_b64(en_b64(data)), data);
 * assertEquals(de_u64(en_u64(data)), data);
 * ```
 *
 * @module base
 */

import { de_b16, en_b16 } from "./src/16.ts";
import {
  de_b32,
  de_c32,
  de_h32,
  de_w32,
  de_z32,
  en_b32,
  en_c32,
  en_h32,
  en_w32,
  en_z32,
} from "./src/32.ts";
import { de_b64, de_u64, en_b64, en_u64 } from "./src/64.ts";

/** Encodes arbitrary string -> binary. */
export const en_bin: ($: string) => Uint8Array = /* @__PURE__ */
  TextEncoder.prototype.encode.bind(/* @__PURE__ */ new TextEncoder());
/** Decodes binary -> arbitrary string. */
export const de_bin: ($: Uint8Array) => string = /* @__PURE__ */
  TextDecoder.prototype.decode.bind(/* @__PURE__ */ new TextDecoder());
export {
  de_b16,
  de_b32,
  de_b64,
  de_c32,
  de_h32,
  de_u64,
  de_w32,
  de_z32,
  en_b16,
  en_b32,
  en_b64,
  en_c32,
  en_h32,
  en_u64,
  en_w32,
  en_z32,
};
