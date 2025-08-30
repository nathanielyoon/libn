import { get_rfc, get_wycheproof, hex, write_vectors } from "@nyoon/test";

await write_vectors(import.meta, {
  rfc8439: await get_rfc(8439, 17603, 62179).then(($) => ({
    "2.3.2": {
      key: hex($.slice(156, 258)),
      iv: hex($.slice(391, 426)),
      count: +$[449],
      state: hex($.slice(1639, 1930)),
    },
    "A.1": $.matchAll(
      /Test Vector #\d:.+?Key:\n(.+?\n)\n.+?Nonce:\n(.+?\n)\n.+?Block Counter = (\d)\n.+?Keystream:\n(.+?\n)\n/gs,
    ).map(([_, key, iv, count, state]) => ({
      key: hex(key),
      iv: hex(iv),
      count: +count,
      state: hex(state),
    })).toArray(),
    "2.5.2": {
      key: hex($.slice(12855, 12957).replace(/\s+/, "")),
      raw: hex(
        $.slice(13324, 13371) + $.slice(13397, 13444) + $.slice(13470, 13475),
      ),
      tag: hex($.slice(15019, 15066)),
    },
  })),
  donna: await fetch(
    `https://raw.githubusercontent.com/floodyberry/poly1305-donna/e6ad6e091d30d7f4ec2d4f978be1fcfcbce72781/poly1305-donna.c`,
  ).then(async ($) =>
    (await $.text()).matchAll(
      /key\[32\] = \{(.+?)\};.+?msg\[\d+\] = \{(.+?)\};.+?mac\[16\] = \{(.+?)\};/gs,
    ).map(([_, key, raw, tag]) => ({
      key: hex(key),
      raw: hex(raw),
      tag: hex(tag),
    })).toArray()
  ),
  wycheproof: await get_wycheproof<{
    key: string;
    iv: string;
    aad: string;
    msg: string;
    ct: string;
    tag: string;
    result: "valid" | "invalid";
  }, { ivSize: number }>(
    "9261e367c14fb762ae28dda9bb5e84b606cdc2fc",
    "xchacha20_poly1305",
    ({ ivSize, tests }) =>
      ivSize !== 192 ? [] : tests.map(($) => ({
        key: $.key,
        iv: $.iv,
        raw: $.msg,
        data: $.aad,
        text: $.ct + $.tag,
        result: $.result === "valid",
      })),
  ),
});
