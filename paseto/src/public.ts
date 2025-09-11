import { de_u64, en_bin, en_u64 } from "@libn/base";
import { is_public, pae, regex } from "./common.ts";
import { sign, verify } from "@libn/25519";

const PREFIX = "v4.public.", HEADER = /* @__PURE__ */ en_bin(PREFIX);
const REGEX = /* @__PURE__ */ regex(PREFIX);
/** Encodes and signs a public PASETO. */
export const en_public = (
  secret_key: Uint8Array,
  message: Uint8Array,
  footer: Uint8Array = new Uint8Array(),
  assertion: Uint8Array = new Uint8Array(),
): string | void => {
  if (!is_public(secret_key)) return;
  const length = message.length, out = new Uint8Array(length + 64);
  out.set(message);
  out.set(sign(secret_key, pae(HEADER, message, footer, assertion)), length);
  const token = PREFIX + en_u64(out);
  return footer.length ? `${token}.${en_u64(footer)}` : token;
};
/** Decodes and verifies a public PASETO. */
export const de_public = (
  public_key: Uint8Array,
  token: string,
  assertion: Uint8Array = new Uint8Array(),
):
  | { message: Uint8Array<ArrayBuffer>; footer: Uint8Array<ArrayBuffer> }
  | void => {
  if (!is_public(public_key)) return;
  const exec = REGEX.exec(token);
  if (!exec) return;
  const payload = de_u64(exec[1]), footer = de_u64(exec[2] ?? "");
  if (
    verify(
      public_key,
      pae(HEADER, payload.subarray(0, -64), footer, assertion),
      payload.subarray(-64),
    )
  ) return { message: new Uint8Array(payload.subarray(0, -64)), footer };
};
