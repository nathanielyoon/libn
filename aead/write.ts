import { into, save, trim } from "@libn/lib";

await Promise.all([
  fetch("https://www.rfc-editor.org/rfc/rfc8439.txt").then(($) => $.text()),
  fetch("https://www.ietf.org/archive/id/draft-irtf-cfrg-xchacha-03.txt").then(
    ($) => $.text(),
  ),
  fetch(
    "https://raw.githubusercontent.com/floodyberry/poly1305-donna/e6ad6e091d30d7f4ec2d4f978be1fcfcbce72781/poly1305-donna.c",
  ).then(($) => $.text()),
  fetch(
    "https://raw.githubusercontent.com/C2SP/wycheproof/9261e367c14fb762ae28dda9bb5e84b606cdc2fc/testvectors_v1/xchacha20_poly1305_test.json",
  ).then<{
    testGroups: {
      ivSize: number;
      tests: {
        key: string;
        iv: string;
        aad: string;
        msg: string;
        ct: string;
        tag: string;
        result: "valid" | "invalid";
      }[];
    }[];
  }>(($) => $.json()),
]).then(([rfc8439, xchacha, donna, wycheproof]) => ({
  chacha: {
    "rfc8439 2.3.2": {
      key: trim(rfc8439.slice(17759, 17861)),
      iv: trim(rfc8439.slice(17994, 18029)),
      count: +rfc8439[18052],
      state: trim(rfc8439.slice(19249, 19515)),
    },
    "rfc8439 A.1": rfc8439.slice(57774, 62180).matchAll(
      /Test Vector #\d:.+?Key:\n(.+?\n)\n.+?Nonce:\n(.+?\n)\n.+?Block Counter = (\d)\n.+?Keystream:\n(.+?\n)\n/gs,
    ).map(([_, key, iv, count, state]) => ({
      key: trim(key),
      iv: trim(iv),
      count: +count,
      state: trim(state),
    })).toArray(),
    xchacha: into(
      ["plaintext", "key", "iv", "keystream", "ciphertext"],
      xchacha.slice(31877, 34302).match(/(?:[\da-f]{32,}\s*)+/g)!.map(trim),
    ),
  },
  poly: {
    "rfc8439 2.5.2": {
      key: trim(rfc8439.slice(30458, 30560).replace(/\s+/, "")),
      raw: trim(
        rfc8439.slice(30927, 30974) + rfc8439.slice(31000, 31047) +
          rfc8439.slice(31073, 31078),
      ),
      tag: trim(rfc8439.slice(32622, 32669)),
    },
    donna: donna.matchAll(
      /key\[32\] = \{(.+?)\};.+?msg\[\d+\] = \{(.+?)\};.+?mac\[16\] = \{(.+?)\};/gs,
    ).map(($) => into(["", "key", "raw", "tag"], $.map(trim))[0]).toArray(),
  },
  aead: {
    "rfc8439 2.8.2": {},
    wycheproof: wycheproof.testGroups.flatMap((group) =>
      group.ivSize !== 192 ? [] : group.tests.map(($) => ({
        key: $.key,
        iv: $.iv,
        plaintext: $.msg,
        associated_data: $.aad,
        ciphertext: $.ct,
        tag: $.tag,
        result: $.result === "valid",
      }))
    ),
  },
})).then(save(import.meta));
