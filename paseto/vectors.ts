import { get, set } from "../test.ts";

const [common, vectors] = await Promise.all([
  get`/paseto-standard/paseto-spec/08be722de0bf5e38f39b6a06ffb2ee01479e6788/docs/01-Protocol-Versions/Common.md${2651}`,
  get`/paseto-standard/test-vectors/f7cfbe02e4e069dddefc9001cd6303b045595ea3/v4.json`,
]);

await set(import.meta, {
  pae: Array.from(
    common.matchAll(/^\* `PAE\((\[.*?\])\)` will always return\s+`(".*?")`/gm),
    ($) => ({
      pieces: JSON.parse($[1].replaceAll("'", '"')),
      output: JSON.parse($[2].replaceAll("\\x", "\\u00")),
    }),
  ),
  ...JSON.parse(vectors).tests.reduce((
    to: { local: any[]; public: any[] },
    $:
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
      ),
  ) => ("key" in $
    ? to.local.push({
      key: $.key,
      nonce: $.nonce,
      payload: $.payload ?? "",
      footer: $.footer,
      assertion: $["implicit-assertion"],
      token: $.token,
      result: !$["expect-fail"],
    })
    : to.public.push({
      secretKey: $["secret-key-seed"],
      publicKey: $["public-key"],
      payload: $.payload ?? "",
      footer: $.footer,
      assertion: $["implicit-assertion"],
      token: $.token,
      result: !$["expect-fail"],
    }),
    to), { local: [], public: [] }),
}, "b44f28aa516024aadb7d4fc5e452f7371b0c854c951e91ddeedb61b36812c9ce");
