import {
  assertEquals,
  assertMatch,
  assertNotMatch,
  assertThrows,
} from "@std/assert";
import fc from "fast-check";
import { deUtf8, enUtf8 } from "@libn/base";
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
import { B58, deB58, enB58 } from "@libn/base/58";
import { B64, deB64, deU64, enB64, enU64, U64 } from "@libn/base/64";
import { A85, deA85, deZ85, enA85, enZ85, Z85 } from "@libn/base/85";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("b16", async (t) => {
  await t.step("b16 passes reference vectors", () => {
    for (const $ of vectors.b16) {
      assertEquals(enB16(enUtf8($.binary)), $.string);
      assertEquals(deB16($.string), enUtf8($.binary));
      assertEquals(deB16($.string.toLowerCase()), enUtf8($.binary));
      assertMatch($.string, B16);
    }
  });
  await t.step("b16 round-trips losslessly", () => {
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      assertEquals(deB16(enB16($)), $);
    }));
  });
  await t.step("enB16() encodes base16", () => {
    assertEquals(enB16(new Uint8Array()), "");
    assertEquals(enB16(enUtf8("Hello world!")), "48656C6C6F20776F726C6421");
  });
  await t.step("deB16() decodes base16", () => {
    assertEquals(deB16(""), new Uint8Array());
    assertEquals(deB16("48656C6C6F20776F726C6421"), enUtf8("Hello world!"));
  });
  await t.step("B16 matches base16", () => {
    assertMatch("", B16);
    assertMatch("0123456789ABCDEF", B16);
    for (const $ of "GHIJKLMNOPQRSTUVWXYZ") assertNotMatch($.repeat(2), B16);
  });
  await t.step("enB16() matches B16 regex", () => {
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      assertMatch(enB16($), B16);
    }));
  });
  await t.step("deB16() ignores invalid characters", () => {
    fc.assert(fc.property(
      fc.stringMatching(RegExp(B16.source.replaceAll("[", "[^"))),
      ($) => {
        assertEquals(deB16($), deB16($).fill(0));
      },
    ));
  });
  await t.step("enB16() follows built-in toHex (but uppercase)", () => {
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      assertEquals(enB16($), $.toHex().toUpperCase());
    }));
  });
  await t.step("deB16() follows built-in fromHex", () => {
    fc.assert(fc.property(fc.uint8Array().map(enB16), ($) => {
      assertEquals(deB16($), Uint8Array.fromHex($));
    }));
  });
  await t.step("deB16() skips the last character of odd-length strings", () => {
    fc.assert(fc.property(fc.stringMatching(B16), ($) => {
      assertEquals(deB16($ + "!"), deB16($));
    }));
  });
});
Deno.test("b32", async (t) => {
  await t.step("b32 passes reference vectors", () => {
    for (const $ of vectors.b32) {
      assertEquals(enB32(enUtf8($.binary)), $.string);
      assertEquals(deB32($.string), enUtf8($.binary));
      assertEquals(deB32($.string.toLowerCase()), enUtf8($.binary));
      assertMatch($.string, B32);
    }
  });
  await t.step("b32 round-trips losslessly", () => {
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      assertEquals(deB32(enB32($)), $);
    }));
  });
  await t.step("enB32() encodes base32", () => {
    assertEquals(enB32(enUtf8("Hello world!")), "JBSWY3DPEB3W64TMMQQQ");
  });
  await t.step("deB32() decodes base32", () => {
    assertEquals(deB32("JBSWY3DPEB3W64TMMQQQ"), enUtf8("Hello world!"));
  });
  await t.step("B32 matches base32", () => {
    assertMatch("", B32);
    assertMatch("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567", B32);
    for (const $ of "0189") assertNotMatch($, B32);
  });
  await t.step("enB32() matches B32 regex", () => {
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      assertMatch(enB32($), B32);
    }));
  });
  await t.step("deB32() ignores invalid characters", () => {
    fc.assert(fc.property(
      fc.stringMatching(RegExp(B32.source.replaceAll("[", "[^"))),
      ($) => {
        assertEquals(deB32($), deB32($).fill(0));
      },
    ));
  });
});
Deno.test("h32", async (t) => {
  await t.step("h32 passes reference vectors", () => {
    for (const $ of vectors.h32) {
      assertEquals(enH32(enUtf8($.binary)), $.string);
      assertEquals(deH32($.string), enUtf8($.binary));
      assertEquals(deH32($.string.toLowerCase()), enUtf8($.binary));
      assertMatch($.string, H32);
    }
  });
  await t.step("h32 round-trips losslessly", () => {
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      assertEquals(deH32(enH32($)), $);
    }));
  });
  await t.step("enH32() encodes base32hex", () => {
    assertEquals(enH32(enUtf8("Hello world!")), "91IMOR3F41RMUSJCCGGG");
  });
  await t.step("deH32() decodes base32hex", () => {
    assertEquals(deH32("91IMOR3F41RMUSJCCGGG"), enUtf8("Hello world!"));
  });
  await t.step("H32 matches base32hex", () => {
    assertMatch("", H32);
    assertMatch("0123456789ABCDEFGHIJKLMNOPQRSTUV", H32);
    for (const $ of "WwXxYyZz") assertNotMatch($, H32);
  });
  await t.step("enH32() matches H32 regex", () => {
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      assertMatch(enH32($), H32);
    }));
  });
  await t.step("deH32() ignores invalid characters", () => {
    fc.assert(fc.property(
      fc.stringMatching(RegExp(H32.source.replaceAll("[", "[^"))),
      ($) => {
        assertEquals(deH32($), deH32($).fill(0));
      },
    ));
  });
});
Deno.test("c32", async (t) => {
  await t.step("c32 passes reference vectors", () => {
    for (const $ of vectors.c32) {
      assertEquals(enC32(Uint8Array.fromHex($.binary)), $.string);
      assertEquals(deC32($.string), Uint8Array.fromHex($.binary));
      assertEquals(deC32($.string.toLowerCase()), Uint8Array.fromHex($.binary));
      assertMatch($.string, C32);
    }
  });
  await t.step("c32 round-trips losslessly", () => {
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      assertEquals(deC32(enC32($)), $);
    }));
  });
  await t.step("enC32() encodes Crockford base32", () => {
    assertEquals(enC32(new Uint8Array()), "");
    assertEquals(enC32(enUtf8("Hello world!")), "91JPRV3F41VPYWKCCGGG");
  });
  await t.step("deC32() decodes Crockford base32", () => {
    assertEquals(deC32(""), new Uint8Array());
    assertEquals(deC32("91JPRV3F41VPYWKCCGGG"), enUtf8("Hello world!"));
  });
  await t.step("C32 matches Crockford base32", () => {
    assertMatch("", C32);
    assertMatch("0123456789ABCDEFGHJKMNPQRSTVWXYZ", C32);
    for (const $ of "Uu+/_") assertNotMatch($, C32);
  });
  await t.step("enC32() matches C32 regex", () => {
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      assertMatch(enC32($), C32);
    }));
  });
  await t.step("deC32() ignores invalid characters", () => {
    fc.assert(fc.property(
      fc.stringMatching(RegExp(C32.source.replaceAll("[", "[^"))),
      ($) => {
        assertEquals(deC32($), deC32($).fill(0));
      },
    ));
  });
  await t.step("deC32() accepts similar characters and hyphens", () => {
    fc.assert(fc.property(
      fc.stringMatching(/^[\dA-HJKMNP-TV-Z]$/),
      ($) => {
        const right = deC32($);
        assertEquals(deC32($.toLowerCase()), right);
        for (const wrong of "Oo") {
          assertEquals(deC32($.replaceAll("0", wrong)), right);
        }
        for (const wrong of "IiLl") {
          assertEquals(deC32($.replaceAll("1", wrong)), right);
        }
        assertEquals(deC32($.split("").join("-")), right);
      },
    ));
  });
});
Deno.test("b58", async (t) => {
  await t.step("b58 passes reference vectors", () => {
    for (const $ of vectors.b58) {
      assertEquals(enB58(Uint8Array.fromHex($.binary)), $.string);
      assertEquals(deB58($.string), Uint8Array.fromHex($.binary));
      assertMatch($.string, B58);
    }
  });
  await t.step("b58 round-trips losslessly", () => {
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      assertEquals(deB58(enB58($)), $);
    }));
  });
  await t.step("enB58() encodes base58", () => {
    assertEquals(enB58(new Uint8Array()), "");
    assertEquals(enB58(enUtf8("Hello world!")), "2NEpo7TZRhna7vSvL");
  });
  await t.step("deB58() decodes base58", () => {
    assertEquals(deB58(""), new Uint8Array());
    assertEquals(deB58("2NEpo7TZRhna7vSvL"), enUtf8("Hello world!"));
  });
  await t.step("B58 matches base58", () => {
    assertMatch("", B58);
    assertMatch(
      "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
      B58,
    );
    for (const $ of "0IOl") assertNotMatch($, B58);
  });
  await t.step("enB58() matches B58 regex", () => {
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      assertMatch(enB58($), B58);
    }));
  });
  await t.step("deB58() ignores invalid characters", () => {
    fc.assert(fc.property(
      fc.stringMatching(RegExp(B58.source.replaceAll("[", "[^"))),
      ($) => {
        assertEquals(deB58($), deB58($).fill(0));
      },
    ));
  });
});
Deno.test("b64", async (t) => {
  await t.step("b64 passes reference vectors", () => {
    for (const $ of vectors.b64) {
      assertEquals(enB64(enUtf8($.binary)), $.string);
      assertEquals(deB64($.string), enUtf8($.binary));
      assertEquals(deB64($.string + "="), enUtf8($.binary));
      assertMatch($.string, B64);
    }
  });
  await t.step("b64 round-trips losslessly", () => {
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      assertEquals(deB64(enB64($)), $);
    }));
  });
  await t.step("enB64() encodes base64", () => {
    assertEquals(enB64(new Uint8Array()), "");
    assertEquals(enB64(enUtf8("Hello world!")), "SGVsbG8gd29ybGQh");
  });
  await t.step("deB64() decodes base64", () => {
    assertEquals(deB64(""), new Uint8Array());
    assertEquals(deB64("SGVsbG8gd29ybGQh"), enUtf8("Hello world!"));
  });
  await t.step("B64 matches base64", () => {
    assertMatch("", B64);
    assertMatch(
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
      B64,
    );
    assertNotMatch("=", B64);
    assertNotMatch("AA=", B64);
    assertNotMatch("AAA==", B64);
  });
  await t.step("enB64() matches B64 regex", () => {
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      assertMatch(enB64($), B64);
    }));
  });
  await t.step("deB64() ignores invalid characters", () => {
    fc.assert(fc.property(
      fc.stringMatching(RegExp(B64.source.replaceAll("[", "[^"))),
      ($) => {
        assertEquals(deB64($), deB64($).fill(0));
      },
    ));
  });
  await t.step("enB64() follows built-in toBase64", () => {
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      assertEquals(enB64($), $.toBase64());
    }));
  });
  await t.step("deB64() follows built-in fromBase64", () => {
    fc.assert(fc.property(fc.uint8Array().map(enB64), ($) => {
      assertEquals(deB64($), Uint8Array.fromBase64($));
    }));
  });
  await t.step("deB64() falls back when atob fails", () => {
    assertThrows(() => atob("="));
    assertEquals(deB64("="), new Uint8Array([]));
    assertThrows(() => atob("AA="));
    assertEquals(deB64("AA="), new Uint8Array([0]));
    assertThrows(() => atob("AAA=="));
    assertEquals(deB64("AAA=="), new Uint8Array([0, 0]));
  });
});
Deno.test("u64", async (t) => {
  await t.step("u64 passes reference vectors", () => {
    for (const $ of vectors.u64) {
      assertEquals(enU64(enUtf8($.binary)), $.string);
      assertEquals(deU64($.string), enUtf8($.binary));
      assertMatch($.string, U64);
    }
  });
  await t.step("u64 round-trips losslessly", () => {
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      assertEquals(deU64(enU64($)), $);
    }));
  });
  await t.step("enU64() encodes base64url", () => {
    assertEquals(enU64(new Uint8Array()), "");
    assertEquals(enU64(enUtf8("Hello world!")), "SGVsbG8gd29ybGQh");
  });
  await t.step("deU64() decodes base64url", () => {
    assertEquals(deU64(""), new Uint8Array());
    assertEquals(deU64("SGVsbG8gd29ybGQh"), enUtf8("Hello world!"));
  });
  await t.step("U64 matches base64url", () => {
    assertMatch("", U64);
    assertMatch(
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
      U64,
    );
    for (const $ of "+/=") assertNotMatch($, U64);
  });
  await t.step("enU64() matches U64 regex", () => {
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      assertMatch(enU64($), U64);
    }));
  });
  await t.step("deU64() ignores invalid characters", () => {
    fc.assert(fc.property(
      fc.stringMatching(RegExp(U64.source.replaceAll("[", "[^"))),
      ($) => {
        assertEquals(deU64($), deU64($).fill(0));
      },
    ));
  });
  await t.step("enU64() follows built-in toBase64", () => {
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      assertEquals(
        enU64($),
        $.toBase64({ alphabet: "base64url", omitPadding: true }),
      );
    }));
  });
  await t.step("deU64() follows built-in fromBase64", () => {
    fc.assert(fc.property(fc.uint8Array().map(enU64), ($) => {
      assertEquals(
        deU64($),
        Uint8Array.fromBase64($, { alphabet: "base64url" }),
      );
    }));
  });
});
Deno.test("z85", async (t) => {
  await t.step("z85 passes reference vectors", () => {
    for (const $ of vectors.z85) {
      assertEquals(enZ85(Uint8Array.fromHex($.binary)), $.string);
      assertEquals(deZ85($.string), Uint8Array.fromHex($.binary));
      assertMatch($.string, Z85);
    }
  });
  await t.step("z85 round-trips losslessly", () => {
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 1e3 }).chain(($) =>
        fc.uint8Array({ minLength: $ >> 2 << 2, maxLength: $ >> 2 << 2 })
      ),
      ($) => {
        assertEquals(deZ85(enZ85($)), $);
      },
    ));
  });
  await t.step("enZ85() encodes Z85", () => {
    assertEquals(enZ85(enUtf8("Hello world!")), "nm=QNzY<mxA+]nf");
  });
  await t.step("deZ85() decodes Z85", () => {
    assertEquals(deZ85("nm=QNzY<mxA+]nf"), enUtf8("Hello world!"));
  });
  await t.step("Z85 matches Z85", () => {
    assertMatch("", Z85);
    assertMatch(
      "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#",
      Z85,
    );
    for (const $ of "\"',;\\_`") assertNotMatch($, Z85);
  });
  await t.step("enZ85() matches Z85 regex", () => {
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      assertMatch(enZ85($), Z85);
    }));
  });
  await t.step("deZ85() ignores invalid characters", () => {
    fc.assert(fc.property(
      fc.stringMatching(RegExp(Z85.source.replaceAll("[", "[^"))),
      ($) => {
        assertEquals(deZ85($), deZ85($).fill(0));
      },
    ));
  });
});
Deno.test("a85", async (t) => {
  await t.step("a85 passes reference vectors", () => {
    for (const $ of vectors.a85) {
      assertEquals(enA85(enUtf8($.binary)), $.string);
      assertEquals(deA85($.string), enUtf8($.binary));
      assertMatch($.string, A85);
    }
  });
  await t.step("a85 round-trips losslessly", () => {
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      assertEquals(deA85(enA85($)), $);
    }));
  });
  await t.step("enA85() encodes Ascii85", () => {
    assertEquals(enA85(new Uint8Array()), "");
    assertEquals(enA85(enUtf8("Hello world!")), "87cURD]j7BEbo80");
  });
  await t.step("deA85() decodes Ascii85", () => {
    assertEquals(deA85(""), new Uint8Array());
    assertEquals(deA85("87cURD]j7BEbo80"), enUtf8("Hello world!"));
  });
  await t.step("A85 matches Ascii85", () => {
    assertMatch("", A85);
    assertMatch(
      "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstu",
      A85,
    );
    for (const $ of "vwxy{|}~") assertNotMatch($, A85);
  });
  await t.step("enA85() matches A85 regex", () => {
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      assertMatch(enA85($), A85);
    }));
  });
  await t.step("deA85() ignores invalid characters", () => {
    fc.assert(fc.property(
      fc.stringMatching(RegExp(A85.source.replaceAll("[", "[^"))),
      ($) => {
        assertEquals(deA85($), deA85($).fill(0));
      },
    ));
  });
  await t.step("enA85() replaces all-zero chunks", () => {
    for (
      const [binary, string] of [
        [new Uint8Array(1), "!!"],
        [new Uint8Array(2), "!!!"],
        [new Uint8Array(3), "!!!!"],
        [new Uint8Array(4), "z"],
        [new Uint8Array(5), "z!!"],
        // Don't replace when the 5 "!"s span multiple chunks.
        [new Uint8Array(7).with(0, 85), '<<*"!!!!!'],
      ] as const
    ) {
      assertEquals(enA85(binary), string);
      assertEquals(deA85(string), binary);
    }
  });
});
Deno.test("mod", async (t) => {
  await t.step("utf8 round-trips losslessly", () => {
    fc.assert(fc.property(fc.string({ unit: "grapheme" }), ($) => {
      assertEquals(deUtf8(enUtf8($)), $);
    }));
  });
});

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
