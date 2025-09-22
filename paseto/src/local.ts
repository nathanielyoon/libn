import { cipher } from "@libn/aead";
import { de_u64, en_bin, en_u64 } from "@libn/base";
import { b2b } from "@libn/hash";
import { is_local, type Key } from "./key.ts";
import { type Detoken, type Entoken, pae, regex } from "./common.ts";

const STR = "v4.local.";
const BIN = /* @__PURE__ */ en_bin(STR);
const REG = /* @__PURE__ */ regex(STR);
const XOR = /* @__PURE__ */ en_bin("paseto-encryption-key");
const MAC = /* @__PURE__ */ en_bin("paseto-auth-key-for-aead");
const split = (key: Uint8Array, nonce: Uint8Array) => {
  const xor = new Uint8Array(53), mac = new Uint8Array(56);
  xor.set(XOR), xor.set(nonce, 21), mac.set(MAC), mac.set(nonce, 24);
  return { xor_key: b2b(xor, key, 56), mac_key: b2b(mac, key, 32) };
};
/** Encrypts and encodes a local PASETO. */
export const en_local: Entoken<"local"> = (
  key: Key<"local">,
  body: Uint8Array,
  foot: Uint8Array = new Uint8Array(),
  assertion: Uint8Array = new Uint8Array(),
): ReturnType<Entoken<"local">> => {
  if (!is_local(key)) return null;
  const nonce = crypto.getRandomValues(new Uint8Array(32));
  const payload = new Uint8Array(body.length + 64);
  payload.set(nonce), payload.set(body, 32);
  const parts = split(key, nonce), text = payload.subarray(32, -32);
  cipher(parts.xor_key, parts.xor_key.subarray(32), text);
  payload.set(
    b2b(pae(BIN, nonce, text, foot, assertion), parts.mac_key, 32),
    body.length + 32,
  );
  const token = STR + en_u64(payload) as `v4.${string}`;
  return foot.length ? `${token}.${en_u64(foot)}` : token;
};
/** Decodes and decrypts a local PASETO. */
export const de_local: Detoken<"local"> = (
  key: Key<"local">,
  token: string,
  assertion: Uint8Array = new Uint8Array(),
): ReturnType<Detoken> => {
  if (!is_local(key)) return null;
  const exec = REG.exec(token);
  if (!exec) return null;
  const payload = de_u64(exec[1]), foot = de_u64(exec[2] ?? "");
  const nonce = payload.subarray(0, 32), body = payload.subarray(32, -32);
  const parts = split(key, nonce);
  const tag = b2b(pae(BIN, nonce, body, foot, assertion), parts.mac_key, 32);
  let is_different = 0, z = 32, y = payload.length;
  do is_different |= tag[--z] ^ payload[--y]; while (z);
  if (is_different) return null;
  cipher(parts.xor_key, parts.xor_key.subarray(32), body);
  return { body: new Uint8Array(body), foot };
};
