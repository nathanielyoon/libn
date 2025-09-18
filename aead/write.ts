import { into, save, trim } from "@libn/lib";

const sections = <A extends string[]>(from: string[][], keys: A) =>
  Array.from(
    from.map(into.bind(null, ["", ...keys])),
    ([{ count, ...rest }]) => ({
      ...(count === undefined ? {} : { count: Number(count) }),
      ...Object.entries(rest).reduce((to, [key, value]) => ({
        ...to,
        [key]: String(value).match(
          /(?<=^|[\da-f]{2}[\s(:])[\da-f]{2}(?=[\s.):]|$)|(?<=^|[\s(:])[\da-f]{2}(?=[\s.):][\da-f]{2}|$)/g,
        )?.join("") ?? "",
      }), {}),
    }),
  );
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
    "rfc8439 2.3.2/rfc8439 A.1": sections([
      rfc8439.slice(17603, 19535).match(
        /Key = (.+?)\..*?Nonce = \((.+?)\).*?Count = (\d+).*?Block:\n(.+)\n\n/s,
      )!,
      ...rfc8439.slice(57774, 62180).matchAll(
        /Key:\n(.+?)\n\n.*?Nonce:\n(.+?)\n\n.*?Counter = (\d+)\n.*?Keystream:\n(.+?)\n\n/gs,
      ),
    ], ["key", "iv", "count", "state"]),
    "rfc8439 2.4.2/rfc8439 A.2": sections([
      rfc8439.slice(22184, 26014).match(
        /Key = (.+?)\..*?Nonce = \((.+?)\).*?Counter = (\d+).*?Plaintext Sunscreen:\n(.+?)\n\n.*?Ciphertext Sunscreen:\n(.+?)\n\n/s,
      )!,
      ...rfc8439.slice(62351, 69083).matchAll(
        /Key:\n(.+?)\n\n.*?Nonce:\n(.+?)\n\n.*?Counter = (\d+)\n\n.*?Plaintext:\n(.+?)\n\n.*?Ciphertext:\n(.+?)\n\n/gs,
      ),
    ], ["key", "iv", "count", "plaintext", "ciphertext"]),
    "rfc8439 2.6.2/rfc8439 A.4": sections([
      rfc8439.slice(35223, 36189).match(
        /Key:\n(.+?)\n\n.*?Nonce:\n(.+?)\n\n.*?Output bytes:\n(.+?)\n\n/s,
      )!,
      ...rfc8439.slice(78677, 80251).matchAll(
        /Key:?\n(.+?)\n\n.*?nonce:\n(.+?)\n\n.*?key:\n(.+?)\n\n/gs,
      ),
    ], ["key", "iv", "subkey"]),
    xchacha: into(
      ["plaintext", "key", "iv", "keystream", "ciphertext"],
      xchacha.slice(31877, 34302).match(/(?:[\da-f]{32,}\s*)+/g)!.map(trim),
    ),
  },
  poly: {
    "rfc8439 2.5.2/rfc8439 A.3": sections([
      rfc8439.slice(30257, 32670).replace(/(:0)\n {6}(3:)/, "$1$2").match(
        /Key Material: (.+?)\n.*?Message to be Authenticated:\n(.+?)\n\n.*?Tag: (.+)/s,
      )!,
      ...rfc8439.slice(69083, 75560).matchAll(
        /Key:\n(.+?)\n\n.*?Text to MAC:\n(.+?)\n\n.*?Tag:\n(.+?)\n\n/gs,
      ),
      ...rfc8439.slice(75560, 78677).toLowerCase().matchAll(
        /r:\n(.+?)\s*s:\n(.+?)\s*data:\n(.+?)\s*tag:\n(.+?)\n/gs,
      ).map(($) => [$[0], $[1] + $[2], $[3], $[4]]),
    ], ["key", "message", "tag"]),
    donna: Array.from(
      donna.matchAll(
        /key\[32\] = \{(.+?)\};.+?msg\[\d+\] = \{(.+?)\};.+?mac\[16\] = \{(.+?)\};/gs,
      ),
      ($) => into(["", "key", "message", "tag"], $.map(trim))[0],
    ),
  },
  aead: {
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
