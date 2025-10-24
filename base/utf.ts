/**
 * @example
 * ```ts
 * import { assertEquals } from "@std/assert/equals";
 *
 * const binary = new Uint8Array([72, 101, 108, 108, 111, 32, 58, 41]);
 * assertEquals(enUtf8("Hello :)"), binary);
 * assertEquals(deUtf8(binary), "Hello :)");
 *
 * assertEquals(en.call("Hello :)"), 72);
 * assertEquals(en.call("Hello :)", 1), 101);
 * assertEquals(de(...binary), "Hello :)");
 * ```
 *
 * @module utf8
 */

/** Character code getter. */
export const en: (this: string, index?: number) => number =
  /* @__PURE__ */ (() =>
    String.prototype.charCodeAt as (this: string, index?: number) => number)();
/** Character code setter. */
export const de: (...codes: number[]) => string =
  /* @__PURE__ */ (() => String.fromCharCode)();
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
