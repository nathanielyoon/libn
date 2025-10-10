import { describe, it } from "@std/testing/bdd";
import { expect } from "@std/expect/expect";
import fc from "fast-check";
import { type Decode, deUtf8, type Encode, enUtf8 } from "@libn/base";
import { B16, deB16, enB16 } from "@libn/base/16";
import {
  B32,
  C32,
  deB32,
  deC32,
  deH32,
  enB32,
  enC32,
  enH32,
  H32,
} from "@libn/base/32";
import { B64, deB64, deU64, enB64, enU64, U64 } from "@libn/base/64";
import { A85, deA85, deZ85, enA85, enZ85, Z85 } from "@libn/base/85";

Deno.test("spec", async () => {
  const vectors = await import("./vectors.json", { with: { type: "json" } });
  for (const $ of vectors.default.b16) {
    expect(enB16(enUtf8($.binary))).toStrictEqual($.string);
    expect(deB16($.string)).toStrictEqual(enUtf8($.binary));
  }
  for (const $ of vectors.default.b32) {
    expect(enB32(enUtf8($.binary))).toStrictEqual($.string);
    expect(deB32($.string)).toStrictEqual(enUtf8($.binary));
  }
  for (const $ of vectors.default.h32) {
    expect(enH32(enUtf8($.binary))).toStrictEqual($.string);
    expect(deH32($.string)).toStrictEqual(enUtf8($.binary));
  }
  for (const $ of vectors.default.b64) {
    expect(enB64(enUtf8($.binary))).toStrictEqual($.string);
    expect(deB64($.string)).toStrictEqual(enUtf8($.binary));
  }
  for (const $ of vectors.default.u64) {
    expect(enU64(enUtf8($.binary))).toStrictEqual($.string);
    expect(deU64($.string)).toStrictEqual(enUtf8($.binary));
  }
  for (const $ of vectors.default.z85) {
    expect(enZ85(deB16($.binary))).toStrictEqual($.string);
    expect(deZ85($.string)).toStrictEqual(deB16($.binary));
  }
  for (const $ of vectors.default.a85) {
    expect(enA85(enUtf8($.binary))).toStrictEqual($.string);
    expect(deA85($.string)).toStrictEqual(enUtf8($.binary));
  }
});
const roundTrip = <A, B>(
  encode: ($: A) => B,
  decode: ($: B) => A,
  arbitrary: fc.Arbitrary<A>,
) =>
  fc.assert(fc.property(arbitrary, ($) => {
    expect(decode(encode($))).toStrictEqual($);
  }));
const encodeMatch = (encode: Encode, pattern: RegExp) =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    expect(encode($)).toMatch(pattern);
  }));
const invalid = (decode: Decode, pattern: RegExp) =>
  fc.assert(fc.property(
    fc.stringMatching(RegExp(pattern.source.replaceAll("[", "[^"))),
    ($) => {
      const binary = decode($);
      expect(binary).toStrictEqual(new Uint8Array(binary.length));
    },
  ));
describe("16", () => {
  roundTrip(enB16, deB16, fc.uint8Array());
  it("encodeB16() :: built-in toHex", () =>
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      expect(enB16($)).toStrictEqual($.toHex());
    })));
  it("encodeB16() matches B16 regex", () => encodeMatch(enB16, B16));
  it("decodeB16() :: built-in fromHex", () =>
    fc.assert(fc.property(fc.stringMatching(B16), ($) => {
      expect(deB16($)).toStrictEqual(Uint8Array.fromHex($));
    })));
  it("decodeB16() ignores invalid characters", () => invalid(deB16, B16));
  it("decodeB16(odd-length) skips trailing character", () =>
    fc.assert(fc.property(fc.stringMatching(B16), ($) => {
      const base = deB16($);
      for (let z = 0; z < 16; ++z) {
        expect(deB16($ + z.toString(16))).toStrictEqual(base);
      }
    })));
});
describe("32", () => {
  roundTrip(enB32, deB32, fc.uint8Array());
  it("encodeB32() matches B32 regex", () => encodeMatch(enB32, B32));
  it("decodeB32() ignores invalid characters", () => invalid(deB32, B32));
  roundTrip(enH32, deH32, fc.uint8Array());
  it("encodeH32() matches H32 regex", () => encodeMatch(enH32, H32));
  it("decodeH32() ignores invalid characters", () => invalid(deH32, H32));
  roundTrip(enC32, deC32, fc.uint8Array());
  it("encodeC32() matches C32 regex", () => encodeMatch(enC32, C32));
  it("decodeC32() ignores invalid characters", () => invalid(deC32, C32));
});
describe("64", () => {
  roundTrip(enB64, deB64, fc.uint8Array());
  it("encodeB64() :: built-in toBase64", () =>
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      expect(enB64($)).toStrictEqual($.toBase64());
    })));
  it("encodeB64() matches B64 regex", () => encodeMatch(enB64, B64));
  it("decodeB64() :: built-in fromBase64", () =>
    fc.assert(fc.property(fc.stringMatching(B64), ($) => {
      expect(deB64($)).toStrictEqual(Uint8Array.fromBase64($));
    })));
  it("decodeB64() ignores invalid characters", () => invalid(deB64, B64));
  roundTrip(enU64, deU64, fc.uint8Array());
  it("encodeU64() :: built-in toBase64", () =>
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      expect(enU64($)).toStrictEqual(
        $.toBase64({ alphabet: "base64url", omitPadding: true }),
      );
    })));
  it("encodeU64() matches U64 regex", () => encodeMatch(enU64, U64));
  it("decodeU64() :: built-in fromBase64", () =>
    fc.assert(fc.property(fc.stringMatching(U64), ($) => {
      expect(deU64($)).toStrictEqual(
        Uint8Array.fromBase64($, { alphabet: "base64url" }),
      );
    })));
  it("decodeU64() ignores invalid characters", () => invalid(deU64, U64));
});
describe("85", () => {
  const fcStep4 = fc.integer({ min: 0, max: 1e3 }).map(($) => $ >> 2 << 2);
  roundTrip(
    enZ85,
    deZ85,
    fcStep4.chain(($) => fc.uint8Array({ minLength: $, maxLength: $ })),
  );
  it("encodeZ85() matches Z85 regex", () => encodeMatch(enZ85, Z85));
  it("decodeZ85() ignores invalid characters", () => invalid(deZ85, Z85));
  roundTrip(enA85, deA85, fc.uint8Array());
  it("encodeA85() matches A85 regex", () => encodeMatch(enA85, A85));
  it("decodeA85() ignores invalid characters", () => invalid(deA85, A85));
  it('encodeA85() replaces all-zero chunks with "z"', () =>
    fc.assert(fc.property(fcStep4.map(($) => new Uint8Array($)), ($) => {
      expect(enA85($)).toMatch(RegExp(`^z{${$.length >> 2}}$`));
    })));
});
describe("mod", () => {
  it("encodeUtf8() :: independent instantiation/call", () =>
    fc.assert(fc.property(fc.string({ unit: "grapheme" }), ($) => {
      expect(enUtf8($)).toStrictEqual(new TextEncoder().encode($));
    })));
  it("decodeUtf8() :: independent instantiation/call", () =>
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      expect(deUtf8($)).toStrictEqual(new TextDecoder().decode($));
    })));
});
import.meta.main && await Promise.all([
  fetch(
    "https://www.rfc-editor.org/rfc/rfc4648.txt",
  ).then(($) => $.text()).then(($) => $.slice(25691, 26723)),
  fetch(
    "https://raw.githubusercontent.com/zeromq/rfc/3d4c0cef87ed761fe09ab9abf8a6e5ea45df0e9f/src/spec_32.c",
  ).then(($) => $.text()).then(($) => $.slice(4717, 5975)),
  fetch(
    "https://en.wikipedia.org/w/index.php?title=Ascii85&oldid=1305034107",
  ).then(($) => $.text()),
]).then(([rfc4648, spec32, wikipedia]) => {
  const matchRfc = (base: string, map: (string: string) => string) =>
    Array.from(
      rfc4648.matchAll(RegExp(`BASE${base}\\("(.*)"\\) = "(.*)"`, "g")),
      ([_, binary, string]) => ({
        binary,
        string: map(string),
      }),
    );
  return {
    b16: matchRfc("16", ($) => $.toLowerCase()),
    b32: matchRfc("32", ($) => $.replace(/=+$/, "")),
    h32: matchRfc("32-HEX", ($) => $.replace(/=+$/, "")),
    b64: matchRfc("64", ($) => $),
    u64: matchRfc("64", ($) => $.replace(/=+$/, "")),
    z85: Array.from([1, 2], ($) => {
      const [_, bytes, string] = RegExp(
        `byte test_data_${$} \\[\\d+\\] = \\{(.+?)\\};.*?encoded = Z85_encode \\(test_data_${$}.*?assert \\(streq \\(encoded, "(.+?)"\\)\\)`,
        "s",
      ).exec(spec32)!;
      return {
        binary: bytes.match(/(?<=0x)[\dA-F]{2}\b/g)!.join("").toLowerCase(),
        string,
      };
    }),
    a85: [{
      binary: /(?<=<code>).{269}(?=<\/code>)/s.exec(wikipedia)![0],
      string: /(?<=<pre>)(.{395})(?=<\/pre>)/s.exec(wikipedia)![0]
        .replaceAll("&lt;", "<").replaceAll("&gt;", ">")
        .replaceAll("&amp;", "&").replaceAll("\n", ""),
    }],
  };
}).then(($) =>
  Deno.writeTextFile(
    new URL(import.meta.resolve("./vectors.json")).pathname,
    JSON.stringify($),
  )
);
