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
import { getJson, getText, save, test } from "../test.ts";
import vectors from "./vectors.json" with { type: "json" };

test("b16.enB16 : example binary", [
  ["", ""],
  ["Hello world!", "48656C6C6F20776F726C6421"],
], ($) => [enB16(enUtf8($[0])), $[1]]);
test("b16.enB16 :: built-in toHex", fc.uint8Array(), ($) => [
  enB16($),
  $.toHex().toUpperCase(),
]);
test("b16.deB16 : valid string", [
  ["", ""],
  ["48656C6C6F20776F726C6421", "Hello world!"],
], ($) => [deB16($[0]), enUtf8($[1])]);
test(
  "b16.deB16 : invalid string",
  fc.stringMatching(RegExp(B16.source.replaceAll("[", "[^"))),
  ($) => [deB16($), deB16($).fill(0)],
);
test("b16.deB16 :: built-in fromHex", fc.uint8Array().map(enB16), ($) => [
  deB16($),
  Uint8Array.fromHex($),
]);
test("b16.B16 : invalid characters", [
  ..."GHIJKLMNOPQRSTUVWXYZghijklmnopqrstuvwxyz",
], ($) => assertNotMatch($.repeat(2), B16));
test(
  "b16.B16 : odd-length string",
  fc.stringMatching(RegExp(`^[\\dA-Fa-f]${B16.source.slice(1)}`)),
  ($) => assertNotMatch($, B16),
);
test("b16 : vectors", vectors.b16, ($) => {
  assertEquals(enB16(enUtf8($.binary)), $.string);
  assertEquals(deB16($.string), enUtf8($.binary));
  assertEquals(deB16($.string.toLowerCase()), enUtf8($.binary));
  assertMatch($.string, B16);
});
test("b16 : binary", fc.uint8Array(), ($) => {
  const string = enB16($);
  assertMatch(string, B16);
  return [deB16(string)];
});

test("b32.enB32 : example binary", [
  ["", ""],
  ["Hello world!", "JBSWY3DPEB3W64TMMQQQ"],
], ($) => [enB32(enUtf8($[0])), $[1]]);
test("b32.deB32 : valid string", [
  ["", ""],
  ["JBSWY3DPEB3W64TMMQQQ", "Hello world!"],
], ($) => [deB32($[0]), enUtf8($[1])]);
test(
  "b32.deB32 : invalid string",
  fc.stringMatching(RegExp(B32.source.replaceAll("[", "[^"))),
  ($) => [deB32($), deB32($).fill(0)],
);
test("b32.B32 : invalid characters", [
  ..."0189",
], ($) => assertNotMatch($, B32));
test("b32 : vectors", vectors.b32, ($) => {
  assertEquals(enB32(enUtf8($.binary)), $.string);
  assertEquals(deB32($.string), enUtf8($.binary));
  assertEquals(deB32($.string.toLowerCase()), enUtf8($.binary));
  assertMatch($.string, B32);
});
test("b32 : binary", fc.uint8Array(), ($) => {
  const string = enB32($);
  return assertMatch(string, B32), [deB32(string)];
});

test("h32.enH32 : example binary", [
  ["", ""],
  ["Hello world!", "91IMOR3F41RMUSJCCGGG"],
], ($) => [enH32(enUtf8($[0])), $[1]]);
test("h32.deH32 : valid string", [
  ["", ""],
  ["91IMOR3F41RMUSJCCGGG", "Hello world!"],
], ($) => [deH32($[0]), enUtf8($[1])]);
test(
  "h32.deH32 : invalid string",
  fc.stringMatching(RegExp(H32.source.replaceAll("[", "[^"))),
  ($) => [deH32($), deH32($).fill(0)],
);
test("h32.H32 : invalid characters", [
  ..."WwXxYyZz",
], ($) => assertNotMatch($, H32));
test("h32 : vectors", vectors.h32, ($) => {
  assertEquals(enH32(enUtf8($.binary)), $.string);
  assertEquals(deH32($.string), enUtf8($.binary));
  assertEquals(deH32($.string.toLowerCase()), enUtf8($.binary));
  assertMatch($.string, H32);
});
test("h32 : binary", fc.uint8Array(), ($) => {
  const string = enH32($);
  return assertMatch(string, H32), [deH32(string)];
});

test("c32.enC32 : example binary", [
  ["", ""],
  ["Hello world!", "91JPRV3F41VPYWKCCGGG"],
], ($) => [enC32(enUtf8($[0])), $[1]]);
test("c32.deC32 : valid string", [
  ["", ""],
  ["91JPRV3F41VPYWKCCGGG", "Hello world!"],
], ($) => [deC32($[0]), enUtf8($[1])]);
test(
  "c32.deC32 : invalid string",
  fc.stringMatching(RegExp(C32.source.replaceAll("[", "[^"))),
  ($) => [deC32($), deC32($).fill(0)],
);
test("c32.deC32 : similar characters/hyphens", fc.stringMatching(C32), ($) => {
  const ok = deC32($);
  assertEquals(deC32($.toLowerCase()), ok);
  for (const no of "Oo") assertEquals(deC32($.replaceAll("0", no)), ok);
  for (const no of "IiLl") assertEquals(deC32($.replaceAll("1", no)), ok);
  assertEquals(deC32($.split("").join("-")), ok);
});
test("c32.C32 : invalid characters", [
  ..."Uu+/_",
], ($) => assertNotMatch($, C32));
test("c32 : vectors", vectors.c32, ($) => {
  assertEquals(enC32(Uint8Array.fromHex($.binary)), $.string);
  assertEquals(deC32($.string), Uint8Array.fromHex($.binary));
  assertEquals(deC32($.string.toLowerCase()), Uint8Array.fromHex($.binary));
  assertMatch($.string, C32);
});
test("c32 : binary", fc.uint8Array(), ($) => {
  const string = enC32($);
  return assertMatch(string, C32), [deC32(string)];
});

test("b58.enB58 : example binary", [
  ["", ""],
  ["Hello world!", "2NEpo7TZRhna7vSvL"],
], ($) => [enB58(enUtf8($[0])), $[1]]);
test("b58.deB58 : valid string", [
  ["", ""],
  ["2NEpo7TZRhna7vSvL", "Hello world!"],
], ($) => [deB58($[0]), enUtf8($[1])]);
test(
  "b58.deB58 : invalid string",
  fc.stringMatching(RegExp(B58.source.replaceAll("[", "[^"))),
  ($) => [deB58($), deB58($).fill(0)],
);
test("b58.B58 : invalid characters", [
  ..."0IOl",
], ($) => assertNotMatch($, B58));
test("b58 : vectors", vectors.b58, ($) => {
  assertEquals(enB58(Uint8Array.fromHex($.binary)), $.string);
  assertEquals(deB58($.string), Uint8Array.fromHex($.binary));
  assertMatch($.string, B58);
});
test("b58 : binary", fc.uint8Array(), ($) => {
  const string = enB58($);
  return assertMatch(string, B58), [deB58(string)];
});

test("b64.enB64 : example binary", [
  ["", ""],
  ["Hello world!", "SGVsbG8gd29ybGQh"],
], ($) => [enB64(enUtf8($[0])), $[1]]);
test("b64.enB64 :: built-in toBase64", fc.uint8Array(), ($) => [
  enB64($),
  $.toBase64(),
]);
test("b64.deB64 : valid string", [
  ["", ""],
  ["SGVsbG8gd29ybGQh", "Hello world!"],
], ($) => [deB64($[0]), enUtf8($[1])]);
test(
  "b64.deB64 : invalid string",
  fc.stringMatching(RegExp(B64.source.replaceAll("[", "[^"))),
  ($) => [deB64($), deB64($).fill(0)],
);
test("b64.deB64 :: built-in fromBase64", fc.uint8Array().map(enB64), ($) => [
  deB64($),
  Uint8Array.fromBase64($),
]);
test("b64.B64 : invalid characters", [..."-_"], ($) => assertNotMatch($, B64));
test("b64.B64 : invalid padding", [
  "=",
  "AA=",
  "AAA==",
], ($) => assertNotMatch($, B64));
test("b64.deB64 : atob fail", ["=", "AA=", "AAA=="], ($) => {
  assertThrows(() => atob($));
  return [deB64($), new Uint8Array($.length >> 1)];
});
test("b64 : vectors", vectors.b64, ($) => {
  assertEquals(enB64(enUtf8($.binary)), $.string);
  assertEquals(deB64($.string), enUtf8($.binary));
  assertEquals(deB64($.string + "="), enUtf8($.binary));
  assertMatch($.string, B64);
});
test("b64 : binary", fc.uint8Array(), ($) => {
  const string = enB64($);
  return assertMatch(string, B64), [deB64(string)];
});

test("u64.enU64 : example binary", [
  ["", ""],
  ["Hello world!", "SGVsbG8gd29ybGQh"],
], ($) => [enU64(enUtf8($[0])), $[1]]);
test("u64.enU64 :: built-in toBase64", fc.uint8Array(), ($) => [
  enU64($),
  $.toBase64({ alphabet: "base64url", omitPadding: true }),
]);
test("u64.deU64 : valid string", [
  ["", ""],
  ["SGVsbG8gd29ybGQh", "Hello world!"],
], ($) => [deU64($[0]), enUtf8($[1])]);
test(
  "u64.deU64 : invalid string",
  fc.stringMatching(RegExp(U64.source.replaceAll("[", "[^"))),
  ($) => [deU64($), deU64($).fill(0)],
);
test("u64.deU64 :: built-in fromBase64", fc.uint8Array().map(enU64), ($) => [
  deU64($),
  Uint8Array.fromBase64($, { alphabet: "base64url" }),
]);
test("u64.U64 : invalid characters", [..."+/="], ($) => assertNotMatch($, U64));
test("u64 : vectors", vectors.u64, ($) => {
  assertEquals(enU64(enUtf8($.binary)), $.string);
  assertEquals(deU64($.string), enUtf8($.binary));
  assertMatch($.string, U64);
});
test("u64 : binary", fc.uint8Array(), ($) => {
  const string = enU64($);
  return assertMatch(string, U64), [deU64(string)];
});

test("z85.enZ85 : example binary", [
  ["", ""],
  ["Hello world!", "nm=QNzY<mxA+]nf"],
], ($) => [enZ85(enUtf8($[0])), $[1]]);
test("z85.deZ85 : valid string", [
  ["", ""],
  ["nm=QNzY<mxA+]nf", "Hello world!"],
], ($) => [deZ85($[0]), enUtf8($[1])]);
test(
  "z85.deZ85 : invalid string",
  fc.stringMatching(RegExp(Z85.source.replaceAll("[", "[^"))),
  ($) => [
    deZ85($),
    deZ85($).fill(0),
  ],
);
test("z85.Z85 : invalid characters", [
  ..."\"',;\\_`",
], ($) => assertNotMatch($, Z85));
test("z85 : vectors", vectors.z85, ($) => {
  assertEquals(enZ85(Uint8Array.fromHex($.binary)), $.string);
  assertEquals(deZ85($.string), Uint8Array.fromHex($.binary));
  assertMatch($.string, Z85);
});
test(
  "z85 : binary",
  fc.integer({ min: 0, max: 1e3 }).chain(($) =>
    fc.uint8Array({ minLength: $ >> 2 << 2, maxLength: $ >> 2 << 2 })
  ),
  ($) => {
    const string = enZ85($);
    return assertMatch(string, Z85), [deZ85(string)];
  },
);

test("a85.enA85 : example binary", [
  ["", ""],
  ["Hello world!", "87cURD]j7BEbo80"],
], ($) => [enA85(enUtf8($[0])), $[1]]);
test("a85.enA85 : all-zero chunks", [
  [new Uint8Array(1), "!!"],
  [new Uint8Array(2), "!!!"],
  [new Uint8Array(3), "!!!!"],
  [new Uint8Array(4), "z"],
  [new Uint8Array(5), "z!!"],
  [new Uint8Array(7).with(0, 85), '<<*"!!!!!'], // "!"s span multiple chunks
], ([binary, string]) => [deA85(string), binary]);
test("a85.deA85 : valid string", [
  ["", ""],
  ["87cURD]j7BEbo80", "Hello world!"],
], ($) => [deA85($[0]), enUtf8($[1])]);
test(
  "a85.deA85 : invalid string",
  fc.stringMatching(RegExp(A85.source.replaceAll("[", "[^"))),
  ($) => [deA85($), deA85($).fill(0)],
);
test("a85.A85 : invalid characters", [
  ..."vwxy{|}~",
], ($) => assertNotMatch($, A85));
test("a85 : vectors", vectors.a85, ($) => {
  assertEquals(enA85(enUtf8($.binary)), $.string);
  assertEquals(deA85($.string), enUtf8($.binary));
  assertMatch($.string, A85);
});
test("a85 : binary", fc.uint8Array(), ($) => {
  const string = enA85($);
  return assertMatch(string, A85), [deA85(string)];
});

import.meta.main && Promise.all([
  getText("www.rfc-editor.org/rfc/rfc4648.txt", 25691, 26723),
  getText("crockford.com/base32.html", 2219, 5211),
  getText("/zeromq/rfc/3d4c0cef87ed761fe09ab9abf8a6e5ea45df0e9f/src/spec_32.c"),
  getJson<[string, string][]>(
    "/bitcoin/bitcoin/5dd3a0d8a899e4c7263d5b999135f4d7584e1244/src/test/data/base58_encode_decode.json",
  ),
  getText("en.wikipedia.org/w/index.php?title=Ascii85&oldid=1305034107"),
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
  b58: base58.map(([binary, string]) => ({ binary, string })),
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
})).then(save(import.meta));
