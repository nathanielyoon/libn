import.meta.main && await Promise.all([
  fetch(
    "https://www.rfc-editor.org/rfc/rfc4648.txt",
  ).then(($) => $.text()).then(($) => $.slice(25691, 26723)).then(
    (rfc4648) => (base: string, removePadding: boolean) =>
      Array.from(
        rfc4648.matchAll(RegExp(`BASE${base}\\("(.*)"\\) = "(.*)"`, "g")),
        ([_, binary, string]) => ({
          binary,
          string: removePadding ? string.replace(/=+$/, "") : string,
        }),
      ),
  ),
  fetch(
    "https://crockford.com/base32.html",
  ).then(($) => $.text()).then(($) => $.slice(2219, 5211)),
  fetch(
    "https://raw.githubusercontent.com/zeromq/rfc/3d4c0cef87ed761fe09ab9abf8a6e5ea45df0e9f/src/spec_32.c",
  ).then(($) => $.text()).then(($) => $.slice(4717, 5975)),
  fetch(
    "https://raw.githubusercontent.com/bitcoin/bitcoin/5dd3a0d8a899e4c7263d5b999135f4d7584e1244/src/test/data/base58_encode_decode.json",
  ).then<[string, string][]>(($) => $.json()),
  fetch(
    "https://en.wikipedia.org/w/index.php?title=Ascii85&oldid=1305034107",
  ).then(($) => $.text()),
]).then(([rfc4648, crockford, spec32, base58, wikipedia]) => ({
  b16: rfc4648("16", false),
  b32: rfc4648("32", true),
  h32: rfc4648("32-HEX", true),
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
  b58: base58.map(([binary, string]) => ({ binary, string })),
  b64: rfc4648("64", false),
  u64: rfc4648("64", true),
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
})).then(($) =>
  Deno.writeTextFile(
    new URL(import.meta.resolve("./vectors.json")).pathname,
    JSON.stringify($),
  )
);
