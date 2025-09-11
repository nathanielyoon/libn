import { xor } from "@libn/aead";
import { de_u64, en_bin, en_u64 } from "@libn/base";
import { b2b } from "@libn/hash";
import { is_local, pae, regex } from "./common.ts";

const PREFIX = "v4.local.", HEADER = /* @__PURE__ */ en_bin(PREFIX);
const REGEX = /* @__PURE__ */ regex(PREFIX);
const split = (key: Uint8Array, nonce: Uint8Array) => {
  const tmp = b2b(
    new Uint8Array([...en_bin("paseto-encryption-key"), ...nonce]),
    key,
    56,
  );
  return {
    Ek: new Uint8Array(tmp.subarray(0, 32)),
    n2: new Uint8Array(tmp.subarray(32)),
    Ak: b2b(
      new Uint8Array([...en_bin("paseto-auth-key-for-aead"), ...nonce]),
      key,
      32,
    ),
  };
};
export const en_local = (
  key: Uint8Array,
  message: Uint8Array,
  footer: Uint8Array = new Uint8Array(),
  assertion: Uint8Array = new Uint8Array(),
) => {
  if (!is_local(key)) return;
  const n = crypto.getRandomValues(new Uint8Array(32));
  const { Ek, Ak, n2 } = split(key, n);
  const c = new Uint8Array(message);
  xor(Ek, n2, c);
  const t = b2b(pae(HEADER, n, c, footer, assertion), Ak, 32);
  const token = PREFIX + en_u64(new Uint8Array([...n, ...c, ...t]));
  return footer.length ? `${token}.${en_u64(footer)}` : token;
};
export const de_local = (
  key: Uint8Array,
  token: string,
  assertion: Uint8Array = new Uint8Array(),
) => {
  if (!is_local(key)) return;
  const exec = REGEX.exec(token);
  if (!exec) return;
  const payload = de_u64(exec[1]), footer = de_u64(exec[2] ?? "");
  const n = payload.subarray(0, 32);
  const t = payload.subarray(-32);
  const c = payload.subarray(32, -32);
  const { Ek, n2, Ak } = split(key, n);
  const tag = b2b(pae(HEADER, n, c, footer, assertion), Ak, 32);
  if (t.join() === tag.join()) {
    return xor(Ek, n2, c), { message: new Uint8Array(c), footer };
  }
};
