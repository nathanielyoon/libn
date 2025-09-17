import { into, save, trim } from "@libn/lib";

await Promise.all([
  fetch("https://www.rfc-editor.org/rfc/rfc7748.txt").then(($) => $.text()),
  fetch("https://www.rfc-editor.org/rfc/rfc8032.txt").then(($) => $.text()),
  fetch(
    "https://raw.githubusercontent.com/C2SP/wycheproof/6b17607867ce8e3c3a2a4e1e35ccc3b42bfd75e3/testvectors_v1/x25519_test.json",
  ).then<{
    testGroups: {
      tests: { private: string; public: string; shared: string }[];
    }[];
  }>(($) => $.json()),
  fetch(
    "https://raw.githubusercontent.com/C2SP/wycheproof/0d2dab394df1eb05b0865977f7633d010a98bccd/testvectors_v1/ed25519_test.json",
  ).then<{
    testGroups: {
      publicKey: { pk: string };
      tests: { msg: string; sig: string; result: "valid" | "invalid" }[];
    }[];
  }>(($) => $.json()),
]).then(([rfc7748, rfc8032, wycheproof_x25519, wycheproof_ed25519]) => ({
  x25519: {
    "rfc7748 5.2": into(
      rfc7748.slice(18300, 19695).match(/(?<=^ {5})[\da-f]{64}$/gm)!,
      ["scalar", "coordinate", "output"],
    ),
    "rfc7748 6.1": into(
      rfc7748.slice(23217, 25093).match(/(?<=^ {5})[\da-f]{64}$/gm)!,
      ["secret_a", "public_a", "secret_b", "public_b", "shared"],
    )[0],
    wycheproof: wycheproof_x25519.testGroups.flatMap((group) =>
      group.tests.map(($) => ({
        secret_key: $.private,
        public_key: $.public,
        shared_secret: $.shared,
      }))
    ),
  },
  ed25519: {
    "rfc8032 7.1": into(
      rfc8032.slice(46947, 52155).replace(
        /\n{3}Josefsson {1}& {1}Liusvaara {9}Informational {20}\[Page {1}2[56]\]\n\f\nRFC {1}8032 {16}EdDSA: {1}Ed25519 {1}and {1}Ed448 {12}January {1}2017\n{3}/g,
        "",
      ).match(
        /(?<=^ {3}(?:(?:SECRET|PUBLIC) KEY|MESSAGE \(length \d+ bytes?\)|SIGNATURE):\n)(?: {3}(?:[\da-f]{2})+\n)*/gm,
      )!.map(trim),
      ["secret_key", "public_key", "message", "signature"],
    ),
    wycheproof: wycheproof_ed25519.testGroups.flatMap((group) =>
      group.tests.map(($) => ({
        public_key: group.publicKey.pk,
        message: $.msg,
        signature: $.sig,
        result: $.result === "valid",
      }))
    ),
  },
})).then(save(import.meta));
