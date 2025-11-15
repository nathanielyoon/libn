/** @module */
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
  const hash = sha512($);
  return (enBig(hash) | enBig(hash.subarray(32)) << 256n) % N;
};
/** Derives an Ed25519 public key from a secret key. */
export const generate = ($: Uint8Array): Uint8Array<ArrayBuffer> =>
  enPoint(enBig(prune($)));
/** Creates an Ed25519 digital signature. */
export const sign = (
  secretKey: Uint8Array,
  message: Uint8Array,
): Uint8Array<ArrayBuffer> => {
  const a = prune(secretKey), b = new Uint8Array(message.length + 64);
  b.set(a.subarray(32)), b.set(message, 32);
  const c = enBig(a), d = int(b.subarray(0, -32));
  a.set(enPoint(d)), b.set(a), b.set(enPoint(c), 32), b.set(message, 64);
  return a.set(deBig((d + c * int(b) % N) % N), 32), a;
};
/** Verifies a message's Ed25519 signature. */
export const verify = (
  publicKey: Uint8Array,
  message: Uint8Array,
  signature: Uint8Array,
): null | boolean => {
  if (signature.length !== 64) return false;
  const a = enBig(signature.subarray(32));
  if (a >= N) return false;
  let b = dePoint(publicKey);
  if (b < 0n) return false;
  const c = new Uint8Array(message.length + 64);
  c.set(signature), c.set(publicKey.subarray(0, 32), 32), c.set(message, 64);
  let d = int(c), e = I;
  // No secret information is involved, so unsafe double-and-add is ok.
  do if (d & 1n) e = add(e, b); while (b = double(b), d >>= 1n);
  return b = dePoint(signature), b >= 0n && equals(wnaf(a).a, add(e, b));
};
