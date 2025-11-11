import { A85, deA85, enA85 } from "@libn/base/a85";
import { B16, deB16, enB16 } from "@libn/base/b16";
import { B32, deB32, enB32 } from "@libn/base/b32";
import { B58, deB58, enB58 } from "@libn/base/b58";
import { B64, deB64, enB64 } from "@libn/base/b64";
import { C32, deC32, enC32 } from "@libn/base/c32";
import { deH32, enH32, H32 } from "@libn/base/h32";
import { deU64, enU64, U64 } from "@libn/base/u64";
import { deZ85, enZ85, Z85 } from "@libn/base/z85";
import { enUtf8 } from "@libn/utf";
import {
  assertEquals,
  assertMatch,
  assertNotMatch,
  assertThrows,
} from "@std/assert";
import fc from "fast-check";
import { get, set } from "../test.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("b16 : vectors", () => {
  for (const $ of vectors.b16) {
    assertEquals(enB16(enUtf8($.binary)), $.string);
    assertEquals(deB16($.string), enUtf8($.binary));
    assertEquals(deB16($.string.toLowerCase()), enUtf8($.binary));
    assertMatch($.string, B16);
  }
});
Deno.test("b16 : binary", () => {
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    const string = enB16($);
    assertMatch(string, B16), assertEquals(deB16(string), $);
  }));
});
Deno.test("b16.enB16 :: built-in toHex", () => {
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    assertEquals(enB16($), $.toHex().toUpperCase());
  }));
});
Deno.test("b16.deB16 :: built-in fromHex", () => {
  fc.assert(fc.property(fc.uint8Array().map(enB16), ($) => {
    assertEquals(deB16($), Uint8Array.fromHex($));
  }));
});
Deno.test("b16.B16 : invalid base16", () => {
  for (const $ of "GHIJKLMNOPQRSTUVWXYZghijklmnopqrstuvwxyz") {
    assertNotMatch($.repeat(2), B16);
  }
  fc.assert(fc.property(
    fc.stringMatching(RegExp(`^[\\dA-Fa-f]${B16.source.slice(1)}`)),
    ($) => {
      assertNotMatch($, B16);
    },
  ));
});

Deno.test("b32 : vectors", () => {
  for (const $ of vectors.b32) {
    assertEquals(enB32(enUtf8($.binary)), $.string);
    assertEquals(deB32($.string), enUtf8($.binary));
    assertEquals(deB32($.string.toLowerCase()), enUtf8($.binary));
    assertMatch($.string, B32);
  }
});
Deno.test("b32 : binary", () => {
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    const string = enB32($);
    assertMatch(string, B32), assertEquals(deB32(string), $);
  }));
});
Deno.test("b32.B32 : invalid base32", () => {
  for (const $ of "0189") assertNotMatch($, B32);
});

Deno.test("h32 : vectors", () => {
  for (const $ of vectors.h32) {
    assertEquals(enH32(enUtf8($.binary)), $.string);
    assertEquals(deH32($.string), enUtf8($.binary));
    assertEquals(deH32($.string.toLowerCase()), enUtf8($.binary));
    assertMatch($.string, H32);
  }
});
Deno.test("h32 : binary", () => {
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    const string = enH32($);
    assertMatch(string, H32), assertEquals(deH32(string), $);
  }));
});
Deno.test("h32.H32 : invalid base32hex", () => {
  for (const $ of "WwXxYyZz") assertNotMatch($, H32);
});

Deno.test("c32 : vectors", () => {
  for (const $ of vectors.c32) {
    assertEquals(enC32(Uint8Array.fromHex($.binary)), $.string);
    assertEquals(deC32($.string), Uint8Array.fromHex($.binary));
    assertEquals(deC32($.string.toLowerCase()), Uint8Array.fromHex($.binary));
    assertMatch($.string, C32);
  }
});
Deno.test("c32 : binary", () => {
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    const string = enC32($);
    assertMatch(string, C32), assertEquals(deC32(string), $);
  }));
});
Deno.test("c32.C32 : invalid Crockford base32", () => {
  for (const $ of "Uu+/_") assertNotMatch($, C32);
});
Deno.test("c32.C32 : similar characters/hyphens", () => {
  fc.assert(fc.property(fc.stringMatching(C32), ($) => {
    const ok = deC32($);
    assertEquals(deC32($.toLowerCase()), ok);
    for (const no of "Oo") assertEquals(deC32($.replaceAll("0", no)), ok);
    for (const no of "IiLl") assertEquals(deC32($.replaceAll("1", no)), ok);
    assertEquals(deC32($.split("").join("-")), ok);
  }));
});

Deno.test("b58 : vectors", () => {
  for (const $ of vectors.b58) {
    assertEquals(enB58(Uint8Array.fromHex($.binary)), $.string);
    assertEquals(deB58($.string), Uint8Array.fromHex($.binary));
    assertMatch($.string, B58);
  }
});
Deno.test("b58 : binary", () => {
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    const string = enB58($);
    assertMatch(string, B58), assertEquals(deB58(string), $);
  }));
});
Deno.test("b58.B58 : invalid base58", () => {
  for (const $ of "0IOl") assertNotMatch($, B58);
});

Deno.test("b64 : vectors", () => {
  for (const $ of vectors.b64) {
    assertEquals(enB64(enUtf8($.binary)), $.string);
    assertEquals(deB64($.string), enUtf8($.binary));
    assertMatch($.string, B64);
  }
});
Deno.test("b64 : binary", () => {
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    const string = enB64($);
    assertMatch(string, B64), assertEquals(deB64(string), $);
  }));
});
Deno.test("b64.enB64 :: built-in toBase64", () => {
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    assertEquals(enB64($), $.toBase64());
  }));
});
Deno.test("b64.deB64 :: built-in fromBase64", () => {
  fc.assert(fc.property(fc.uint8Array().map(enB64), ($) => {
    assertEquals(deB64($), Uint8Array.fromBase64($));
  }));
});
Deno.test("b64.B64 : invalid base64", () => {
  for (const $ of "-_") assertNotMatch($, B64);
  for (const $ of ["=", "AA=", "AAA=="]) {
    assertNotMatch($, B64);
    assertThrows(() => atob($));
    assertEquals(deB64($), new Uint8Array($.length >> 1));
  }
});

Deno.test("u64 : vectors", () => {
  for (const $ of vectors.u64) {
    assertEquals(enU64(enUtf8($.binary)), $.string);
    assertEquals(deU64($.string), enUtf8($.binary));
    assertMatch($.string, U64);
  }
});
Deno.test("u64 : binary", () => {
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    const string = enU64($);
    assertMatch(string, U64), assertEquals(deU64(string), $);
  }));
});
Deno.test("u64.enU64 :: built-in toBase64", () => {
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    assertEquals(
      enU64($),
      $.toBase64({ alphabet: "base64url", omitPadding: true }),
    );
  }));
});
Deno.test("u64.deU64 :: built-in fromBase64", () => {
  fc.assert(fc.property(fc.uint8Array().map(enU64), ($) => {
    assertEquals(deU64($), Uint8Array.fromBase64($, { alphabet: "base64url" }));
  }));
});
Deno.test("u64.U64 : invalid base64url", () => {
  for (const $ of "+/=") assertNotMatch($, U64);
});

Deno.test("z85 : vectors", () => {
  for (const $ of vectors.z85) {
    assertEquals(enZ85(Uint8Array.fromHex($.binary)), $.string);
    assertEquals(deZ85($.string), Uint8Array.fromHex($.binary));
    assertMatch($.string, Z85);
  }
});
Deno.test("z85.Z85 : invalid Z85", () => {
  for (const $ of "\"',;\\_`") assertNotMatch($, Z85);
});
Deno.test("z85 : binary", () => {
  fc.assert(fc.property(
    fc.integer({ min: 0, max: 1e3 }).chain(($) =>
      fc.uint8Array({ minLength: $ >> 2 << 2, maxLength: $ >> 2 << 2 })
    ),
    ($) => {
      const string = enZ85($);
      assertMatch(string, Z85), assertEquals(deZ85(string), $);
    },
  ));
});

Deno.test("a85 : vectors", () => {
  for (const $ of vectors.a85) {
    assertEquals(enA85(enUtf8($.binary)), $.string);
    assertEquals(deA85($.string), enUtf8($.binary));
    assertMatch($.string, A85);
  }
});
Deno.test("a85 : binary", () => {
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    const string = enA85($);
    assertMatch(string, A85), assertEquals(deA85(string), $);
  }));
});
Deno.test("a85.enA85 : all-zero chunks", () => {
  for (
    const $ of [
      ["!!", new Uint8Array(1)],
      ["!!!", new Uint8Array(2)],
      ["!!!!", new Uint8Array(3)],
      ["z", new Uint8Array(4)],
      ["z!!", new Uint8Array(5)],
      ['<<*"!!!!!', new Uint8Array(7).with(0, 85)], // "!"s span multiple chunks
    ] as const
  ) assertEquals(deA85($[0]), $[1]);
});
Deno.test("a85.A85 : invalid Ascii85", () => {
  for (const $ of "vwxy{|}~") assertNotMatch($, A85);
});

import.meta.main && Promise.all([
  get`www.rfc-editor.org/rfc/rfc4648.txt${25691}${26723}`,
  get`crockford.com/base32.html${2215}${5383}`,
  get`/zeromq/rfc/3d4c0cef87ed761fe09ab9abf8a6e5ea45df0e9f/src/spec_32.c${4717}`,
  get`/bitcoin/bitcoin/5dd3a0d8a899e4c7263d5b999135f4d7584e1244/src/test/data/base58_encode_decode.json`,
  get`en.wikipedia.org/w/index.php?title=Ascii85&oldid=1305034107${46088}${69413}`,
]).then(([rfc4648, crockford, spec32, base58, wikipedia]) => ({
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
})).then(set(import.meta));
