import { sha512 } from "@libn/hash";
import { de_big, en_big, N, prune } from "./curve.ts";
import { add, de_point, double, en_point, equal, wnaf } from "./point.ts";

const int = ($: Uint8Array) => {
  const a = sha512($);
  return (en_big(a) | en_big(a.copyWithin(0, 32)) << 256n) % N;
};
/** Derives a public key from a secret key. */
export const generate = ($: Uint8Array): Uint8Array<ArrayBuffer> =>
  en_point(en_big(prune($)));
/** Creates an Ed25519 digital signature. */
export const sign = (
  secret_key: Uint8Array,
  data: Uint8Array,
): Uint8Array<ArrayBuffer> => {
  const a = prune(secret_key), b = new Uint8Array(data.length + 64);
  b.set(a.subarray(32)), b.set(data, 32);
  const c = en_big(a), d = int(b.subarray(0, -32));
  a.set(en_point(d)), b.set(a), b.set(en_point(c), 32), b.set(data, 64);
  return a.set(de_big((d + c * int(b) % N) % N), 32), a;
};
/** Verifies a signed message. */
export const verify = (
  public_key: Uint8Array,
  data: Uint8Array,
  signature: Uint8Array,
): boolean => {
  if (signature.length !== 64) return false;
  const a = en_big(signature.subarray(32));
  if (a >= N) return false;
  const b = new Uint8Array(data.length + 64);
  b.set(signature), b.set(public_key, 32), b.set(data, 64);
  let c = 1n << 256n | 1n << 512n, d = de_point(public_key);
  if (d < 0n) return false;
  let e = int(b);
  do e & 1n && (c = add(c, d)), d = double(d); while (e >>= 1n);
  d = de_point(signature);
  if (d < 0n) return false;
  return equal(add(c, d), wnaf(a)[0]);
};
