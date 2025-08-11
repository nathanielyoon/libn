export * from "./16.ts";
export * from "./64.ts";
/** Encodes arbitrary string -> binary. */
export const en_bin: ($: string) => Uint8Array = /* @__PURE__ */ TextEncoder
  .prototype.encode.bind(/* @__PURE__ */ new TextEncoder());
/** Decodes binary -> arbitrary string. */
export const de_bin: ($: Uint8Array) => string = /* @__PURE__ */ TextDecoder
  .prototype.decode.bind(/* @__PURE__ */ new TextDecoder());
