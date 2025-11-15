/** @module */
import { deBig, enBig, inv, mod, prune } from "./lib.ts";

/** Converts an Ed25519 secret key to its X25519 equivalent. */
export const convertSecret = (key: Uint8Array): Uint8Array<ArrayBuffer> =>
  new Uint8Array(prune(key).subarray(0, 32));
/** Converts an Ed25519 public key to its X25519 equivalent. */
export const convertPublic = (key: Uint8Array): Uint8Array<ArrayBuffer> => {
  const a = enBig(key) & ~(1n << 255n), b = deBig(mod((1n + a) * inv(1n - a)));
  return b[31] &= 127, b;
};
