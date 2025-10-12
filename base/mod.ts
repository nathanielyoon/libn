/**
 * Binary-to-text encoding.
 *
 * @example RFC4648 schemes
 * ```ts
 * import { deB16, enB16 } from "@libn/base/16";
 * import { deB32, deH32, enB32, enH32 } from "@libn/base/32";
 * import { deB64, deU64, enB64, enU64 } from "@libn/base/64";
 * import { assertEquals } from "@std/assert";
 *
 * const data = crypto.getRandomValues(new Uint8Array(100));
 *
 * assertEquals(deB16(enB16(data)), data); // base16
 * assertEquals(deB32(enB32(data)), data); // base32
 * assertEquals(deH32(enH32(data)), data); // base32hex
 * assertEquals(deB64(enB64(data)), data); // base64
 * assertEquals(deU64(enU64(data)), data); // base64url
 * ```
 *
 * @example Other schemes
 * ```ts
 * import { deC32, enC32 } from "@libn/base/32";
 * import { deA85, deZ85, enA85, enZ85 } from "@libn/base/85";
 * import { assertEquals } from "@std/assert";
 *
 * const data = crypto.getRandomValues(new Uint8Array(100));
 *
 * assertEquals(deC32(enC32(data)), data); // Crockford base32
 * assertEquals(deZ85(enZ85(data)), data); // z85
 * assertEquals(deA85(enA85(data)), data); // ascii85
 * ```
 *
 * @example Bound `TextEncoder` and `TextDecoder` methods
 * ```ts
 * import { deUtf8, enUtf8 } from "@libn/base";
 * import { assertEquals } from "@std/assert";
 *
 * const data = enUtf8("Hello");
 * assertEquals(data, new TextEncoder().encode("Hello"));
 * assertEquals(deUtf8(data), new TextDecoder().decode(data));
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
export { B16, deB16, enB16 } from "./16.ts";
export {
  B32,
  C32,
  deB32,
  deC32,
  deH32,
  enB32,
  enC32,
  enH32,
  H32,
} from "./32.ts";
export { B64, deB64, deU64, enB64, enU64, U64 } from "./64.ts";
export { A85, deA85, deZ85, enA85, enZ85, Z85 } from "./85.ts";
