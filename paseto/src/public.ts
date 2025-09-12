import { sign, verify } from "@libn/25519";
import { de_u64, en_bin, en_u64 } from "@libn/base";
import { type Decode, type Encode, is_public, pae, regex } from "./common.ts";

const STR = "v4.public.", BIN = /* @__PURE__ */ en_bin(STR);
const REG = /* @__PURE__ */ regex(STR);
/** Encodes and signs a public PASETO. */
export const en_public: Encode = (
  secret_key: Uint8Array,
  message: Uint8Array,
  footer: Uint8Array = new Uint8Array(),
  assertion: Uint8Array = new Uint8Array(),
): ReturnType<Encode> => {
  if (!is_public(secret_key)) return null;
  const length = message.length, payload = new Uint8Array(length + 64);
  payload.set(message);
  payload.set(sign(secret_key, pae(BIN, message, footer, assertion)), length);
  const token = (STR + en_u64(payload)) as `v4.${string}`;
  return footer.length ? `${token}.${en_u64(footer)}` : token;
};
/** Decodes and verifies a public PASETO. */
export const de_public: Decode = (
  public_key: Uint8Array,
  token: string,
  assertion: Uint8Array = new Uint8Array(),
): ReturnType<Decode> => {
  if (!is_public(public_key)) return null;
  const exec = REG.exec(token);
  if (!exec) return null;
  const payload = de_u64(exec[1]), footer = de_u64(exec[2] ?? "");
  if (
    !verify(
      public_key,
      pae(BIN, payload.subarray(0, -64), footer, assertion),
      payload.subarray(-64),
    )
  ) return null;
  return { message: new Uint8Array(payload.subarray(0, -64)), footer };
};
