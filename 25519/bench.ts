import fc from "fast-check";
import { fc_bench, fc_bin } from "@libn/lib";
import {
  convert_public,
  convert_secret,
  derive,
  exchange,
  generate,
  sign,
  verify,
} from "./mod.ts";
import {
  ed25519 as noble_ed25519,
  x25519 as noble_x25519,
} from "@noble/curves/ed25519.js";
import * as stablelib_ed25519 from "@stablelib/ed25519";
import * as stablelib_x25519 from "@stablelib/x25519";
import tweetnacl from "tweetnacl";
import ed2curve from "ed2curve";

fc_bench("generate", fc.tuple(fc_bin(32)), {
  libn: (secret_key) => generate(secret_key),
  "@noble/curves": (secret_key) => noble_ed25519.getPublicKey(secret_key),
  stablelib: (secret_key) =>
    stablelib_ed25519.generateKeyPairFromSeed(secret_key).publicKey,
  tweetnacl: (secret_key) =>
    tweetnacl.sign.keyPair.fromSeed(secret_key).publicKey,
});
fc_bench(
  "sign",
  fc.tuple(
    fc_bin(32),
    fc_bin(),
  ).map(([key, message]) =>
    [
      key,
      message,
      stablelib_ed25519.generateKeyPairFromSeed(key).secretKey,
      tweetnacl.sign.keyPair.fromSeed(key).secretKey,
    ] as const
  ),
  {
    libn: (secret_key, message) => sign(secret_key, message),
    "@noble/curves": (secret_key, message) =>
      noble_ed25519.sign(message, secret_key),
    stablelib: (_, message, secret_key) =>
      stablelib_ed25519.sign(secret_key, message),
    tweetnacl: (_, message, __, secret_key) =>
      tweetnacl.sign.detached(message, secret_key),
  },
);
fc_bench(
  "verify",
  fc.tuple(fc_bin(32), fc_bin()).map(([key, message]) =>
    [generate(key), message, sign(key, message)] as const
  ),
  {
    libn: (public_key, message, signature) =>
      verify(public_key, message, signature),
    "@noble/curves": (public_key, message, signature) =>
      noble_ed25519.verify(signature, message, public_key),
    stablelib: (public_key, message, signature) =>
      stablelib_ed25519.verify(public_key, message, signature),
    tweetnacl: (public_key, message, signature) =>
      tweetnacl.sign.detached.verify(message, signature, public_key),
  },
);
fc_bench("derive", fc.tuple(fc_bin(32)), {
  libn: derive,
  "@noble/curves": noble_x25519.getPublicKey,
  stablelib: stablelib_x25519.scalarMultBase,
  tweetnacl: tweetnacl.scalarMult.base,
});
fc_bench("exchange", fc.tuple(fc_bin(32), fc_bin(32).map(derive)), {
  libn: exchange,
  "@noble/curves": noble_x25519.getSharedSecret,
  stablelib: stablelib_x25519.sharedKey,
  tweetnacl: tweetnacl.scalarMult,
});
fc_bench("convert_secret", fc.tuple(fc_bin(32)), {
  libn: convert_secret,
  "@noble/curves": noble_ed25519.utils.toMontgomerySecret,
  stablelib: stablelib_ed25519.convertSecretKeyToX25519,
  tweetnacl: ed2curve.convertSecretKey,
}, 10);
fc_bench("convert_public", fc.tuple(fc_bin(32).map(generate)), {
  libn: convert_public,
  "@noble/curves": noble_ed25519.utils.toMontgomery,
  stablelib: stablelib_ed25519.convertPublicKeyToX25519,
  tweetnacl: ed2curve.convertPublicKey,
});
