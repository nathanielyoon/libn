/**
 * Binary-to-text encoding.
 *
 * @example Usage
 * ```ts
 * import { deB16, enB16 } from "@libn/base/16";
 * import { assertEquals } from "@std/assert";
 *
 * const data = new Uint8Array([0x01, 0x23, 0x45, 0x67, 0x89, 0xab, 0xcd, 0xef]);
 * assertEquals(enB16(data), "0123456789ABCDEF");
 * assertEquals(deB16("0123456789ABCDEF"), data);
 * ```
 *
 * @module base
 */

/** Converts UTF-8 to binary. */
export const enUtf8: ($?: string) => Uint8Array<ArrayBuffer> =
  /* @__PURE__ */ TextEncoder.prototype.encode.bind(
    /* @__PURE__ */ new TextEncoder(),
  );
/** Converts binary to UTF-8. */
export const deUtf8: (
  $?: AllowSharedBufferSource,
  options?: TextDecodeOptions,
) => string = /* @__PURE__ */ TextDecoder.prototype.decode.bind(
  /* @__PURE__ */ new TextDecoder("utf-8"),
);
export { de, type Decode, en, type Encode } from "./lib.ts";
