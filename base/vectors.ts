import { get, set } from "../test.ts";

const [rfc4648, crockford, spec32, base58, wikipedia] = await Promise.all([
  get`www.rfc-editor.org/rfc/rfc4648.txt${25691}${26723}`,
  get`crockford.com/base32.html${2215}${5383}`,
  get`/zeromq/rfc/3d4c0cef87ed761fe09ab9abf8a6e5ea45df0e9f/src/spec_32.c${4717}`,
  get`/bitcoin/bitcoin/5dd3a0d8a899e4c7263d5b999135f4d7584e1244/src/test/data/base58_encode_decode.json`,
  get`en.wikipedia.org/w/index.php?title=Ascii85&oldid=1305034107${46088}${69413}`,
]);

await set(import.meta, {
  ...([
    ["16", true],
    ["32", false],
    ["32-HEX", false, "h32"],
    ["64", true],
    ["64", false, "u64"],
  ] as const).reduce((to, [base, pad, key]) => ({
    ...to,
    [key ?? `b${base}`]: Array.from(
      rfc4648.matchAll(RegExp(`BASE${base}\\("(.*)"\\) = "(.*)"`, "g")),
      ([_, binary, string]) => ({
        binary,
        string: pad ? string : string.replace(/=+$/, ""),
      }),
    ),
  }), {}),
  c32: Array.from(
    crockford.matchAll(
      /<tr>.*?<td>(\d+)<\/td>.*?<td><code>[\s\dA-Za-z]+<\/code><\/td>.*?<td><code>([\dA-Z])<\/code><\/td>.*?<\/tr>/gs,
    ),
    ([_, value, encode]) => {
      let total = 0;
      for (let base = +value, z = 0; z < 8; ++z) total = total * 32 + base;
      const binary = new Uint8Array(8);
      new DataView(binary.buffer).setBigUint64(0, BigInt(total));
      return { binary: binary.subarray(3).toHex(), string: encode.repeat(8) };
    },
  ),
  b58: JSON.parse(base58).map(($: [string, string]) => ({
    binary: $[0],
    string: $[1],
  })),
  z85: Array.from([1, 2], ($) => {
    const [_, bytes, string] = RegExp(
      `byte test_data_${$} \\[\\d+\\] = \\{(.+?)\\};.*?encoded = Z85_encode \\(test_data_${$}.*?assert \\(streq \\(encoded, "(.+?)"\\)\\)`,
      "s",
    ).exec(spec32)!;
    return { binary: bytes.match(/(?<=0x)[\dA-F]{2}\b/g)!.join(""), string };
  }),
  a85: [{
    binary: /<code>(.{269})<\/code>/s.exec(wikipedia)![1],
    string: /<pre>(.{395})<\/pre>/s.exec(wikipedia)![1]
      .replaceAll("&lt;", "<").replaceAll("&gt;", ">")
      .replaceAll("&amp;", "&").replaceAll("\n", ""),
  }, {
    binary: "\0".repeat(4),
    string: /<code>(.)<\/code>/.exec(wikipedia)![1],
  }],
}, "5f4a20de70e095a2d73536055ce7c1dc620f2420ea1e9b71c9c1c5be9ae150be");
