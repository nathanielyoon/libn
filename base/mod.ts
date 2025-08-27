export { de_b16, en_b16 } from "./16.ts";
export { de_b32, de_h32, en_b32, en_h32 } from "./32.ts";
export { de_b64, de_u64, en_b64, en_u64 } from "./64.ts";
/** Encodes arbitrary string -> binary. */
export const en_bin: ($: string) => Uint8Array = /* @__PURE__ */ TextEncoder
  .prototype.encode.bind(/* @__PURE__ */ new TextEncoder());
/** Decodes binary -> arbitrary string. */
export const de_bin: ($: Uint8Array) => string = /* @__PURE__ */ TextDecoder
  .prototype.decode.bind(/* @__PURE__ */ new TextDecoder());
