import { en_b16, en_bin } from "@libn/base";
import { write_vectors } from "../test.ts";

await write_vectors(import.meta, {
  pae: await fetch(
    "https://raw.githubusercontent.com/paseto-standard/paseto-spec/08be722de0bf5e38f39b6a06ffb2ee01479e6788/docs/01-Protocol-Versions/Common.md",
  ).then(($) => $.text()).then(($) =>
    $.matchAll(/^\* `PAE\((\[.*?\])\)` will always return\s+`(".*?")`/gm).map(
      ($) => ({
        pieces: JSON.parse($[1].replaceAll("'", '"')).map(en_bin).map(en_b16),
        output: en_b16(en_bin(JSON.parse($[2].replaceAll("\\x", "\\u00")))),
      }),
    ).toArray()
  ),
  spec: await fetch(
    "https://raw.githubusercontent.com/paseto-standard/test-vectors/f7cfbe02e4e069dddefc9001cd6303b045595ea3/v4.json",
  ).then<{
    tests: (
      & {
        "expect-fail": boolean;
        token: string;
        payload: string | null;
        footer: string;
        "implicit-assertion": string;
      }
      & (
        | { key: string; nonce: string }
        | { "secret-key-seed": string; "public-key": string }
      )
    )[];
  }>(($) => $.json()).then(($) =>
    $.tests.reduce<{ local: any[]; public: any[] }>((to, $) => (
      "key" in $
        ? to.local.push({
          key: $.key,
          nonce: $.nonce,
          message: en_b16(en_bin($.payload ?? "")),
          footer: en_b16(en_bin($.footer)),
          assertion: en_b16(en_bin($["implicit-assertion"])),
          token: $.token,
          result: !$["expect-fail"],
        })
        : to.public.push({
          secret_key: $["secret-key-seed"],
          public_key: $["public-key"],
          message: en_b16(en_bin($.payload ?? "")),
          footer: en_b16(en_bin($.footer)),
          assertion: en_b16(en_bin($["implicit-assertion"])),
          token: $.token,
          result: !$["expect-fail"],
        }), to
    ), { local: [], public: [] })
  ),
});
