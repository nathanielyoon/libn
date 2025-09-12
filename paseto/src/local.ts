import { xor } from "@libn/aead";
import { de_u64, en_bin, en_u64 } from "@libn/base";
import { b2b } from "@libn/hash";
import { type Detoken, type Entoken, is_local, pae, regex } from "./common.ts";

const STR = "v4.local.", BIN = /* @__PURE__ */ en_bin(STR);
const REG = /* @__PURE__ */ regex(STR);
const [XOR, MAC] = ["encryption-key", "auth-key-for-aead"].map(($) => {
  const buffer = new Uint8Array($.length + 39); // 7 for "paseto-" + 32 for key
  return buffer.set(en_bin(`paseto-${$}`)), buffer;
});
const split = (key: Uint8Array, nonce: Uint8Array) => {
  XOR.set(nonce, 21), MAC.set(nonce, 24);
  const temp = b2b(XOR, key, 56), mac_key = b2b(MAC, key, 32);
  XOR.fill(0, 21), MAC.fill(0, 24);
  return { xor_key: temp.subarray(0, 32), counter: temp.subarray(32), mac_key };
};
export const en_local: Entoken = (
  key: Uint8Array,
  message: Uint8Array,
  footer: Uint8Array = new Uint8Array(),
  assertion: Uint8Array = new Uint8Array(),
): ReturnType<Entoken> => {
  if (!is_local(key)) return null;
  const nonce = crypto.getRandomValues(new Uint8Array(32));
  const payload = new Uint8Array(message.length + 64);
  payload.set(nonce), payload.set(message, 32);
  const parts = split(key, nonce), text = payload.subarray(32, -32);
  xor(parts.xor_key, parts.counter, text);
  payload.set(
    b2b(pae(BIN, nonce, text, footer, assertion), parts.mac_key, 32),
    message.length + 32,
  );
  const token = STR + en_u64(payload) as `v4.${string}`;
  return footer.length ? `${token}.${en_u64(footer)}` : token;
};
export const de_local: Detoken = (
  key: Uint8Array,
  token: string,
  assertion: Uint8Array = new Uint8Array(),
): ReturnType<Detoken> => {
  if (!is_local(key)) return null;
  const exec = REG.exec(token);
  if (!exec) return null;
  const payload = de_u64(exec[1]), footer = de_u64(exec[2] ?? "");
  const nonce = payload.subarray(0, 32), text = payload.subarray(32, -32);
  const parts = split(key, nonce);
  const tag = b2b(pae(BIN, nonce, text, footer, assertion), parts.mac_key, 32);
  let is_different = 0, z = 32, y = payload.length;
  do is_different |= tag[--z] ^ payload[--y]; while (z);
  if (is_different) return null;
  xor(parts.xor_key, parts.counter, text);
  return { message: new Uint8Array(text), footer };
};
