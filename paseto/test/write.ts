import { save } from "@libn/lib";
import { en_b16, en_bin } from "@libn/base";

await Promise.all([
  fetch(
    "https://raw.githubusercontent.com/paseto-standard/paseto-spec/08be722de0bf5e38f39b6a06ffb2ee01479e6788/docs/01-Protocol-Versions/Common.md",
  ).then(($) => $.text()),
  fetch(
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
  }>(($) => $.json()),
]).then(([spec, vectors]) => ({
  common: {
    pae: Array.from(
      spec.matchAll(/^\* `PAE\((\[.*?\])\)` will always return\s+`(".*?")`/gm),
      ($) => ({
        pieces: JSON.parse($[1].replaceAll("'", '"')),
        output: en_b16(en_bin(JSON.parse($[2].replaceAll("\\x", "\\u00")))),
      }),
    ),
  },
  ...vectors.tests.reduce<{ [key: string]: { spec: any[] } }>((to, $) => (
    "key" in $
      ? to.local.spec.push({
        key: $.key,
        nonce: $.nonce,
        body: en_b16(en_bin($.payload ?? "")),
        foot: en_b16(en_bin($.footer)),
        assertion: en_b16(en_bin($["implicit-assertion"])),
        // Save token as an array so the vector decoding doesn't try to parse it
        // as hex-encoded binary.
        token: [$.token],
        result: !$["expect-fail"],
      })
      : to.public.spec.push({
        secret_key: $["secret-key-seed"],
        public_key: $["public-key"],
        body: en_b16(en_bin($.payload ?? "")),
        foot: en_b16(en_bin($.footer)),
        assertion: en_b16(en_bin($["implicit-assertion"])),
        token: [$.token],
        result: !$["expect-fail"],
      }), to
  ), { local: { spec: [] }, public: { spec: [] } }),
})).then(save(import.meta));
