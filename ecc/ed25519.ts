import { sha512 } from "@libn/hash/sha2";
import {
  add,
  deBig,
  dePoint,
  double,
  enBig,
  enPoint,
  equals,
  I,
  N,
  prune,
  wnaf,
} from "./lib.ts";

const int = ($: Uint8Array) => {
  const a = sha512($);
  return (enBig(a) | enBig(a.subarray(32)) << 256n) % N;
};
/** Derives an Ed25519 public key from a secret key. */
export const generate = ($: Uint8Array): Uint8Array<ArrayBuffer> =>
  enPoint(enBig(prune($)));
/** Creates an Ed25519 digital signature. */
export const sign = (
  secret_key: Uint8Array,
  message: Uint8Array,
): Uint8Array<ArrayBuffer> => {
  const a = prune(secret_key), b = new Uint8Array(message.length + 64);
  b.set(a.subarray(32)), b.set(message, 32);
  const c = enBig(a), d = int(b.subarray(0, -32));
  a.set(enPoint(d)), b.set(a), b.set(enPoint(c), 32), b.set(message, 64);
  return a.set(deBig((d + c * int(b) % N) % N), 32), a;
};
/** Verifies a message's Ed25519 signature. */
export const verify = (
  public_key: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array,
): null | boolean => {
  if (signature.length !== 64) return false;
  const a = enBig(signature.subarray(32));
  if (a >= N) return false;
  const b = new Uint8Array(message.length + 64);
  b.set(signature), b.set(public_key, 32), b.set(message, 64);
  let c = dePoint(public_key);
  if (c < 0n) return false;
  let d = int(b), e = I;
  // No secret information involved, so unsafe double-and-add is ok.
  do if (d & 1n) e = add(e, c); while (c = double(c), d >>= 1n);
  c = dePoint(signature);
  return c >= 0n && equals(wnaf(a).a, add(e, c));
};
