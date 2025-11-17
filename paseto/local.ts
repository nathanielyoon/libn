/** @module */
import { cipher } from "@libn/aead";
import { blake2b } from "@libn/hash/blake2";
import { enUtf8 } from "@libn/utf";
import {
  type DeToken,
  deToken,
  type EnToken,
  enToken,
  type Keyer,
  keyer,
  pae,
} from "./lib.ts";

const KEY = /* @__PURE__ */ ["encryption-key", "auth-key-for-aead"].map(($) => {
  const temp = new Uint8Array($.length + 39);
  return temp.set(enUtf8(`paseto-${$}`)), temp;
});
const xor = (key: Uint8Array, nonce: Uint8Array, text: Uint8Array) => {
  KEY[0].set(nonce, 21), key = blake2b(KEY[0], key, 56);
  // XChaCha uses a 32-byte key and ignores the rest, no need to pass a prefix
  // subarray.
  cipher(key, key.subarray(32), text);
};
const mac = (
  key: Uint8Array,
  nonce: Uint8Array,
  text: Uint8Array,
  footer: Uint8Array,
  assertion: Uint8Array,
) => {
  KEY[1].set(nonce, 24);
  return blake2b(
    pae([enUtf8("v4.local."), nonce, text, footer, assertion]),
    blake2b(KEY[1], key, 32),
    32,
  );
};
/** Local key constructor. */
export const localKey: Keyer<"local"> = /* @__PURE__ */ keyer("local");
/** Encrypts and encodes a local PASETO. */
export const enLocal: EnToken<"local"> = /* @__PURE__ */
  enToken("local", (key, payload, footer, assertion) => {
    const body = new Uint8Array(payload.length + 64), end = payload.length + 32;
    const nonce = body.subarray(0, 32), text = body.subarray(32, end);
    crypto.getRandomValues(nonce), body.set(payload, 32), xor(key, nonce, text);
    return body.set(mac(key, nonce, text, footer, assertion), end), body;
  });
/** Decodes and decrypts a local PASETO. */
export const deLocal: DeToken<"local"> = /* @__PURE__ */
  deToken("local", (key, body, footer, assertion) => {
    const nonce = body.subarray(0, 32), text = body.subarray(32, -32);
    const tag = mac(key, nonce, text, footer, assertion);
    let different = 0, z = 32, y = body.length;
    do different |= tag[--z] ^ body[--y]; while (z);
    if (different) return null;
    return xor(key, nonce, text), { payload: new Uint8Array(text), footer };
  });
