/**
 * Encode/decode in base16, base32, base32hex, and base64url.
 *
 * @example
 * ```ts
 * import * as $ from "jsr:@nyoon/lib/base";
 * import { assertEquals } from "jsr:@std/assert";
 *
 * const data = crypto.getRandomValues(new Uint8Array(100));
 * assertEquals($.de_b16($.en_b16(data)), data);
 * assertEquals($.de_b32($.en_b32(data)), data);
 * assertEquals($.de_h32($.en_h32(data)), data);
 * assertEquals($.de_b64($.en_b64(data)), data);
 * ```
 *
 * @see [RFC 4648](https://www.rfc-editor.org/rfc/rfc4648)
 * @module
 */

export * from "./16.ts";
export * from "./32.ts";
export * from "./64.ts";
/** Encodes arbitrary string -> binary. */
export const en_bin: ($: string) => Uint8Array = /* @__PURE__ */ TextEncoder
  .prototype.encode.bind(/* @__PURE__ */ new TextEncoder());
/** Decodes binary -> arbitrary string. */
export const de_bin: ($: Uint8Array) => string = /* @__PURE__ */ TextDecoder
  .prototype.decode.bind(/* @__PURE__ */ new TextDecoder());
