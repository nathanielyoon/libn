import { expect } from "@std/expect/expect";
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
import { B64, deB64, deU64, enB64, enU64, U64 } from "@libn/base/64";
import { A85, deA85, deZ85, enA85, enZ85, Z85 } from "@libn/base/85";

Deno.test("vectors", async (t) => {
  const vectors = await import("./vectors.json", { with: { type: "json" } });
  await t.step("B16", () =>
    vectors.default.B16.forEach(($) => {
      const binary = enUtf8($.binary);
      expect(enB16(binary)).toStrictEqual($.string);
      expect(deB16($.string)).toStrictEqual(binary);
    }));
  await t.step("B32", () =>
    vectors.default.B32.forEach(($) => {
      const binary = enUtf8($.binary);
      expect(enB32(binary)).toStrictEqual($.string);
      expect(deB32($.string)).toStrictEqual(binary);
    }));
  await t.step("H32", () =>
    vectors.default.H32.forEach(($) => {
      const binary = enUtf8($.binary);
      expect(enH32(binary)).toStrictEqual($.string);
      expect(deH32($.string)).toStrictEqual(binary);
    }));
  await t.step("C32", () =>
    vectors.default.C32.forEach(($) => {
      const binary = deB16($.binary);
      expect(enC32(binary)).toStrictEqual($.string);
      expect(deC32($.string)).toStrictEqual(binary);
    }));
  await t.step("B64", () =>
    vectors.default.B64.forEach(($) => {
      const binary = enUtf8($.binary);
      expect(enB64(binary)).toStrictEqual($.string);
      expect(deB64($.string)).toStrictEqual(binary);
    }));
  await t.step("U64", () =>
    vectors.default.U64.forEach(($) => {
      const binary = enUtf8($.binary);
      expect(enU64(binary)).toStrictEqual($.string);
      expect(deU64($.string)).toStrictEqual(binary);
    }));
  await t.step("Z85", () =>
    vectors.default.Z85.forEach(($) => {
      const binary = deB16($.binary);
      expect(enZ85(binary)).toStrictEqual($.string);
      expect(deZ85($.string)).toStrictEqual(binary);
    }));
  await t.step("A85", () =>
    vectors.default.A85.forEach(($) => {
      const binary = enUtf8($.binary);
      expect(enA85(binary)).toStrictEqual($.string);
      expect(deA85($.string)).toStrictEqual(binary);
    }));
});
const fcInvalid = ($: RegExp) =>
  fc.stringMatching(RegExp($.source.replaceAll("[", "[^")));
Deno.test("deB16(enB16()) round-trips", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    expect(deB16(enB16($))).toStrictEqual($);
  })));
Deno.test("enB16() returns string matching B16 regex", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    expect(enB16($)).toMatch(B16);
  })));
Deno.test("enB16() follows built-in toHex", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    expect(enB16($)).toStrictEqual($.toHex());
  })));
Deno.test("deB16() follows built-in fromHex", () =>
  fc.assert(fc.property(fc.stringMatching(B16), ($) => {
    expect(deB16($)).toStrictEqual(Uint8Array.fromHex($));
  })));
Deno.test("deB16() ignores invalid characters", () =>
  fc.assert(fc.property(fcInvalid(B16), ($) => {
    expect(deB16($)).toStrictEqual(new Uint8Array($.length >> 1));
  })));
Deno.test("deB16() skips last character of odd-length strings", () =>
  fc.assert(fc.property(
    fc.stringMatching(B16),
    fc.string({ minLength: 1, maxLength: 1 }),
    ($, extra) => {
      expect(deB16($ + extra)).toStrictEqual(deB16($));
    },
  )));
Deno.test("deB32(enB32()) round-trips", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    expect(deB32(enB32($))).toStrictEqual($);
  })));
Deno.test("enB32() returns string matching B32 regex", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    expect(enB32($)).toMatch(B32);
  })));
Deno.test("deB32() ignores invalid characters", () =>
  fc.assert(fc.property(fcInvalid(B32), ($) => {
    expect(deB32($)).toStrictEqual(new Uint8Array($.length * 5 >> 3));
  })));
Deno.test("deH32(enH32()) round-trips", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    expect(deH32(enH32($))).toStrictEqual($);
  })));
Deno.test("enH32() returns string matching H32 regex", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    expect(enH32($)).toMatch(H32);
  })));
Deno.test("deH32() ignores invalid characters", () =>
  fc.assert(fc.property(fcInvalid(H32), ($) => {
    expect(deH32($)).toStrictEqual(new Uint8Array($.length * 5 >> 3));
  })));
Deno.test("deC32(enC32()) round-trips", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    expect(deC32(enC32($))).toStrictEqual($);
  })));
Deno.test("enC32() returns string matching C32 regex", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    expect(enC32($)).toMatch(C32);
  })));
Deno.test("deC32() ignores invalid characters", () =>
  fc.assert(fc.property(fcInvalid(C32), ($) => {
    expect(deC32($)).toStrictEqual(new Uint8Array($.length * 5 >> 3));
  })));
Deno.test("deC32() accepts similar characters", () => {
  fc.assert(fc.property(fc.stringMatching(/^[\dA-HJKMNP-TV-Z]$/), ($) => {
    const base = deC32($);
    expect(deC32($.toLowerCase())).toStrictEqual(base);
    for (const wrong of "Oo") {
      expect(deC32($.replaceAll("0", wrong))).toStrictEqual(base);
    }
    for (const wrong of "IiLl") {
      expect(deC32($.replaceAll("1", wrong))).toStrictEqual(base);
    }
  }));
});
Deno.test("deC32() allows hyphens", () =>
  fc.assert(fc.property(fc.stringMatching(C32), ($) => {
    expect(deC32($)).toStrictEqual(deC32($.replaceAll("-", "")));
  })));
Deno.test("deB64(enB64()) round-trips", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    expect(deB64(enB64($))).toStrictEqual($);
  })));
Deno.test("enB64() returns string matching B64 regex", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    expect(enB64($)).toMatch(B64);
  })));
Deno.test("enB64() follows built-in toBase64", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    expect(enB64($)).toStrictEqual($.toBase64());
  })));
Deno.test("deB64() follows built-in fromBase64", () =>
  fc.assert(fc.property(fc.stringMatching(B64), ($) => {
    expect(deB64($)).toStrictEqual(Uint8Array.fromBase64($));
  })));
Deno.test("deB64() ignores invalid characters", () =>
  fc.assert(fc.property(fcInvalid(B64), ($) => {
    expect(deB64($)).toStrictEqual(new Uint8Array($.length * 3 >> 2));
  })));
Deno.test("deU64(enU64()) round-trips", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    expect(deU64(enU64($))).toStrictEqual($);
  })));
Deno.test("enU64() returns string matching U64 regex", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    expect(enU64($)).toMatch(U64);
  })));
Deno.test("enU64() follows built-in toBase64", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    expect(enU64($)).toStrictEqual(
      $.toBase64({ alphabet: "base64url", omitPadding: true }),
    );
  })));
Deno.test("deU64() follows built-in fromBase64", () =>
  fc.assert(fc.property(fc.stringMatching(U64), ($) => {
    expect(deU64($)).toStrictEqual(
      Uint8Array.fromBase64($, { alphabet: "base64url" }),
    );
  })));
Deno.test("deU64() ignores invalid characters", () =>
  fc.assert(fc.property(fcInvalid(U64), ($) => {
    expect(deU64($)).toStrictEqual(new Uint8Array($.length * 3 >> 2));
  })));
const fcStep4 = fc.integer({ min: 0, max: 1e3 }).map(($) => $ >> 2 << 2);
Deno.test("deZ85(enZ85()) round-trips", () =>
  fc.assert(fc.property(
    fcStep4.chain(($) => fc.uint8Array({ minLength: $, maxLength: $ })),
    ($) => {
      expect(deZ85(enZ85($))).toStrictEqual($);
    },
  )));
Deno.test("enZ85() returns string matching Z85 regex", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    expect(enZ85($)).toMatch(Z85);
  })));
Deno.test("deZ85() ignores invalid characters", () =>
  fc.assert(fc.property(fcInvalid(Z85), ($) => {
    expect(deZ85($)).toStrictEqual(new Uint8Array(Math.ceil($.length / 5 * 4)));
  })));
Deno.test("deA85(enA85()) round-trips", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    expect(deA85(enA85($))).toStrictEqual($);
  })));
Deno.test("enA85() returns string matching A85 regex", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    expect(enA85($)).toMatch(A85);
  })));
Deno.test("enA85() replaces all-zero chunks", () =>
  fc.assert(fc.property(fcStep4.map(($) => new Uint8Array($)), ($) => {
    expect(enA85($)).toStrictEqual("z".repeat($.length >> 2));
  })));
Deno.test("deA85() ignores invalid characters", () =>
  fc.assert(fc.property(fcInvalid(A85), ($) => {
    expect(deA85($)).toStrictEqual(
      new Uint8Array(
        $.replace(/\s+/g, "").replaceAll("z", "!!!!!").length / 5 * 4,
      ),
    );
  })));
Deno.test("encodeUtf8() follows independent instantiation/call", () =>
  fc.assert(fc.property(fc.string({ unit: "grapheme" }), ($) => {
    expect(enUtf8($)).toStrictEqual(new TextEncoder().encode($));
  })));
Deno.test("decodeUtf8() follows independent instantiation/call", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    expect(deUtf8($)).toStrictEqual(new TextDecoder().decode($));
  })));
import.meta.main && await Promise.all([
  fetch(
    "https://www.rfc-editor.org/rfc/rfc4648.txt",
  ).then(($) => $.text()).then(($) => $.slice(25691, 26723)),
  fetch(
    "https://crockford.com/base32.html",
  ).then(($) => $.text()).then(($) => $.slice(2219, 5211)),
  fetch(
    "https://raw.githubusercontent.com/zeromq/rfc/3d4c0cef87ed761fe09ab9abf8a6e5ea45df0e9f/src/spec_32.c",
  ).then(($) => $.text()).then(($) => $.slice(4717, 5975)),
  fetch(
    "https://en.wikipedia.org/w/index.php?title=Ascii85&oldid=1305034107",
  ).then(($) => $.text()),
]).then(([rfc4648, crockford, spec32, wikipedia]) => {
  const matchRfc = (base: string, map: (string: string) => string) =>
    Array.from(
      rfc4648.matchAll(RegExp(`BASE${base}\\("(.*)"\\) = "(.*)"`, "g")),
      ([_, binary, string]) => ({
        binary,
        string: map(string),
      }),
    );
  return {
    B16: matchRfc("16", ($) => $.toLowerCase()),
    B32: matchRfc("32", ($) => $.replace(/=+$/, "")),
    H32: matchRfc("32-HEX", ($) => $.replace(/=+$/, "")),
    C32: Array.from(
      crockford.matchAll(
        /<tr>.*?<td>(\d+)<\/td>.*?<td><code>[\s\dA-Za-z]+<\/code><\/td>.*?<td><code>([\dA-Z])<\/code><\/td>.*?<\/tr>/gs,
      ),
      ([_, value, encode]) => {
        let total = 0;
        for (let base = +value, z = 0; z < 8; ++z) total = total * 32 + base;
        const binary = new Uint8Array(8);
        new DataView(binary.buffer).setBigUint64(0, BigInt(total));
        return { binary: enB16(binary.subarray(3)), string: encode.repeat(8) };
      },
    ),
    B64: matchRfc("64", ($) => $),
    U64: matchRfc("64", ($) => $.replace(/=+$/, "")),
    Z85: Array.from([1, 2], ($) => {
      const [_, bytes, string] = RegExp(
        `byte test_data_${$} \\[\\d+\\] = \\{(.+?)\\};.*?encoded = Z85_encode \\(test_data_${$}.*?assert \\(streq \\(encoded, "(.+?)"\\)\\)`,
        "s",
      ).exec(spec32)!;
      return {
        binary: bytes.match(/(?<=0x)[\dA-F]{2}\b/g)!.join("").toLowerCase(),
        string,
      };
    }),
    A85: [{
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
