import { sign, verify } from "@libn/25519";
import { de_u64, en_bin, en_u64 } from "@libn/base";
import { is_public, is_secret, type Key } from "./key.ts";
import { type Detoken, type Entoken, pae, regex } from "./common.ts";

const STR = "v4.public.";
const BIN = /* @__PURE__ */ en_bin(STR);
const REG = /* @__PURE__ */ regex(STR);
/** Signs and encodes a public PASETO. */
export const en_public: Entoken<"secret"> = (
  secret_key: Key<"secret">,
  message: Uint8Array,
  footer: Uint8Array = new Uint8Array(),
  assertion: Uint8Array = new Uint8Array(),
): ReturnType<Entoken> => {
  if (!is_secret(secret_key)) return null;
  const length = message.length, payload = new Uint8Array(length + 64);
  payload.set(message);
  payload.set(sign(secret_key, pae(BIN, message, footer, assertion)), length);
  const token = (STR + en_u64(payload)) as `v4.${string}`;
  return footer.length ? `${token}.${en_u64(footer)}` : token;
};
/** Decodes and verifies a public PASETO. */
export const de_public: Detoken<"public"> = (
  public_key: Key<"public">,
  token: string,
  assertion: Uint8Array = new Uint8Array(),
): ReturnType<Detoken> => {
  if (!is_public(public_key)) return null;
  const exec = REG.exec(token);
  if (!exec) return null;
  const payload = de_u64(exec[1]), foot = de_u64(exec[2] ?? "");
  if (
    !verify(
      public_key,
      pae(BIN, payload.subarray(0, -64), foot, assertion),
      payload.subarray(-64),
    )
  ) return null;
  return { body: new Uint8Array(payload.subarray(0, -64)), foot };
};
