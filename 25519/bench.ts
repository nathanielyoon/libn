import { bench } from "@libn/lib";
import { get_pair, set_pair } from "./test/common.ts";
import * as libn from "./mod.ts";
import {
  ed25519 as noble_ed25519,
  x25519 as noble_x25519,
} from "@noble/curves/ed25519.js";
import * as stablelib_ed25519 from "@stablelib/ed25519";
import * as stablelib_x25519 from "@stablelib/x25519";
import tweetnacl from "tweetnacl";
import ed2curve from "ed2curve";

const edwards = await get_pair("Ed");
const [secret_e, public_e] = await set_pair(edwards);
bench({ group: "generate" }, {
  libn: () => libn.generate(secret_e),
  noble: () => noble_ed25519.getPublicKey(secret_e),
  stablelib: () =>
    stablelib_ed25519.generateKeyPairFromSeed(secret_e).publicKey,
  tweetnacl: () => tweetnacl.sign.keyPair.fromSeed(secret_e).publicKey,
});
const stablelib_key =
  stablelib_ed25519.generateKeyPairFromSeed(secret_e).secretKey;
const tweetnacl_key = tweetnacl.sign.keyPair.fromSeed(secret_e).secretKey;
const message = crypto.getRandomValues(new Uint8Array(100));
bench({ group: "sign" }, {
  libn: () => libn.sign(secret_e, message),
  noble: () => noble_ed25519.sign(message, secret_e),
  stablelib: () => stablelib_ed25519.sign(stablelib_key, message),
  tweetnacl: () => tweetnacl.sign.detached(message, tweetnacl_key),
});
const signature = new Uint8Array(
  await crypto.subtle.sign("Ed25519", edwards.privateKey, message),
);
bench({ group: "verify" }, {
  libn: () => libn.verify(public_e, message, signature),
  noble: () => noble_ed25519.verify(signature, message, public_e),
  stablelib: () => stablelib_ed25519.verify(public_e, message, signature),
  tweetnacl: () => tweetnacl.sign.detached.verify(message, signature, public_e),
});
bench({ group: "convert_public" }, {
  libn: () => libn.convert_public(public_e),
  noble: () => noble_ed25519.utils.toMontgomery(public_e),
  stablelib: () => stablelib_ed25519.convertPublicKeyToX25519(public_e),
  tweetnacl: () => ed2curve.convertPublicKey(public_e),
});
const [secret_m, public_m] = await set_pair(await get_pair("X"));
bench({ group: "derive" }, {
  libn: () => libn.derive(secret_m),
  noble: () => noble_x25519.getPublicKey(secret_m),
  stablelib: () => stablelib_x25519.scalarMultBase(secret_m),
  tweetnacl: () => tweetnacl.scalarMult.base(secret_m),
});
bench({ group: "exchange" }, {
  libn: () => libn.exchange(secret_m, public_m),
  noble: () => noble_x25519.getSharedSecret(secret_m, public_m),
  stablelib: () => stablelib_x25519.sharedKey(secret_m, public_m),
  tweetnacl: () => tweetnacl.scalarMult(secret_m, public_m),
});
