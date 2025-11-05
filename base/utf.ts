/** @module utf */

/** Converts UTF-8 to binary. */
export const enUtf8: ($: string) => Uint8Array<ArrayBuffer> =
  /* @__PURE__ */ TextEncoder.prototype.encode.bind(
    /* @__PURE__ */ new TextEncoder(),
  );
/** Converts binary to UTF-8. */
export const deUtf8: (
  $: ArrayBufferLike | ArrayBufferView<ArrayBufferLike>,
  options?: { stream?: boolean },
) => string = /* @__PURE__ */ TextDecoder.prototype.decode.bind(
  /* @__PURE__ */ new TextDecoder("utf-8"),
);
/** UTF-16 character code encoder. */
export const en: (this: string, index?: number) => number =
  /* @__PURE__ */ (() =>
    String.prototype.charCodeAt as (this: string, index?: number) => number)();
/** UTF-16 character code decoder. */
export const de: (...codes: number[]) => string =
  /* @__PURE__ */ (() => String.fromCharCode)();
