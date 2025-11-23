import { assertEquals, assertMatch, assertNotEquals } from "@std/assert";
import fc from "fast-check";
import { fcBin, fcStr, zip } from "../test.ts";
import {
  deUtf8,
  enUtf8,
  uncase,
  uncode,
  unhtml,
  unline,
  unlone,
  unmark,
  unrexp,
} from "./mod.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("enUtf8 :: built-in TextEncoder", () => {
  fc.assert(fc.property(fcStr(), ($) => {
    assertEquals(enUtf8($), new TextEncoder().encode($));
  }));
});
Deno.test("deUtf8 :: built-in TextDecoder", () => {
  fc.assert(fc.property(fcBin(), ($) => {
    assertEquals(deUtf8($), new TextDecoder().decode($));
  }));
});

Deno.test("unhtml : special entities", () => {
  fc.assert(fc.property(
    fcStr({
      unit: fc.oneof(
        fcStr({ minLength: 1, maxLength: 1, unit: "grapheme" }),
        fc.constantFrom(..."\"&'<>"),
      ),
    }),
    ($) => {
      const escaped = unhtml($);
      assertMatch(escaped, /^(?:[^&"'<>]|&#\d\d;)*$/);
      assertEquals(
        escaped.match(/(?<=&#)\d\d(?=;)/g) ?? [],
        $.match(/[&"'<>]/g)?.map(($) => `${$.charCodeAt(0)}`) ?? [],
      );
    },
  ));
});

Deno.test("unrexp : regex syntax characters", () => {
  for (const $ of "/^$\\*+?{}()[]|") assertEquals(unrexp($), `\\${$}`);
});
const assertEscaped = ($: number | string, size: 2 | 4) => {
  const character = typeof $ === "number" ? String.fromCharCode($) : $;
  assertEquals(
    unrexp(character),
    `\\${size === 2 ? "x" : "u"}${
      character.charCodeAt(0).toString(16).padStart(size, "0")
    }`,
  );
};
Deno.test("unrexp : weird characters", () => {
  // c0 control codes
  for (let z = 0; z <= 0x23; ++z) assertEscaped(z, 2);
  // punctuation
  for (const $ of "&',-:;<=>@_`~") assertEscaped($, 2);
  // other control codes
  for (const $ of "\x7f\x85\xa0") assertEscaped($, 2);
  assertEscaped("\uffef", 4);
  // separators
  for (let z = 0x2000; z <= 0x200a; ++z) assertEscaped(z, 4);
  for (const $ of "\u1680\u2028\u2029\u202f\u205f\u3000") assertEscaped($, 4);
});
Deno.test("unrexp : leading alphanumeric character", () => {
  for (
    const $ of [
      ...Array(10).keys().map(String),
      ..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz",
    ]
  ) assertEscaped($, 2), assertEquals(` ${$}`, ` ${$}`);
});

Deno.test("unlone :: built-in toWellFormed", () => {
  fc.assert(fc.property(
    fc.uint16Array().map(($) =>
      $.reduce((to, code) => to + String.fromCodePoint(code), "")
    ),
    ($) => {
      assertEquals(unlone($), $.toWellFormed());
    },
  ));
});

Deno.test("uncode : vectors", async () => {
  const mapping = new Uint32Array(
    (await zip(
      Uint8Array.fromBase64(vectors.uncode),
      new DecompressionStream("gzip"),
    )).buffer,
  );
  for (let z = 0; z < 0x11000; ++z) {
    assertEquals(uncode(String.fromCodePoint(z)).codePointAt(0), mapping[z]);
  }
});
const assertReplaced = ($: number) =>
  assertEquals(uncode(String.fromCodePoint($)), "\ufffd");
Deno.test("uncode : c0/c1 control codes", () => {
  for (let z = 0; z <= 0x1f; ++z) {
    z !== 0x9 && z !== 0xa && z !== 0xd && assertReplaced(z);
  }
  for (let z = 0x7f; z <= 0x9f; ++z) assertReplaced(z);
});
Deno.test("uncode : lone surrogatees", () => {
  for (let z = 0xd800; z <= 0xdfff; ++z) assertReplaced(z);
});
Deno.test("uncode : noncharacters", () => {
  for (let z = 0; z <= 0x10; ++z) {
    assertReplaced(z << 16 | 0xfffe);
    assertReplaced(z << 16 | 0xffff);
  }
});

Deno.test("unline : line breaks", () => {
  for (const $ of ["\n", "\r\n", "\x85", "\u2028", "\u2029"]) {
    assertEquals(unline($), "\n");
  }
});

Deno.test("unmark : diacritics", () => {
  fc.assert(fc.property(
    fc.record({
      character: fc.oneof(
        fc.integer({ min: 0x41, max: 0x5a }),
        fc.integer({ min: 0x61, max: 0x7a }),
      ).map(String.fromCodePoint),
      mark: fc.integer({ min: 0x300, max: 0x36f }).map(String.fromCodePoint),
    }),
    ({ character, mark }) => {
      assertEquals(unmark(character + mark), character);
    },
  ));
});

Deno.test("uncase : vectors", () => {
  assertEquals(uncase(vectors.uncase[0]), vectors.uncase[1]);
});
Deno.test("uncase : mixed-case string", () => {
  fc.assert(fc.property(fcStr({ unit: "grapheme" }), ($) => {
    assertEquals(uncase($), uncase($.toLowerCase()));
  }));
});
Deno.test("uncase : full case folding", () => {
  for (const $ of "\xdf\u0130\u0149\u01f0") {
    assertNotEquals(uncase($).length, $.length);
  }
});
Deno.test("uncase : non-Turkic mapping", () => {
  assertEquals(uncase("\x49"), "\x69");
  assertEquals(uncase("\u0130"), "\x69\u0307");
});
