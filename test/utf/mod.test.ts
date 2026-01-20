import { uncase, uncode, unline, unlone, unmark, untext } from "@libn/utf";
import { assertEquals, assertNotEquals } from "@std/assert";
import fc from "fast-check";
import { fcStr } from "../test.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("untext :: built-in TextEncoder", () => {
  fc.assert(fc.property(fcStr(), (str) => {
    assertEquals(untext(str), new TextEncoder().encode(str));
  }));
});

Deno.test("unlone : lone surrogates", () => {
  for (let z = 0xd800; z < 0xe000; ++z) {
    assertEquals(unlone(String.fromCharCode(z)), "\ufffd");
  }
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

const assertReplaced = ($: number) =>
  assertEquals(uncode(String.fromCodePoint($)), "\ufffd");
Deno.test("uncode : vectors", () => {
  const mapping = new Uint32Array(Uint8Array.fromBase64(vectors.uncode).buffer);
  for (let z = 0; z < 0x11000; ++z) {
    assertEquals(uncode(String.fromCodePoint(z)).codePointAt(0), mapping[z]);
  }
});
Deno.test("uncode : c0/c1 control codes", () => {
  for (let z = 0; z <= 0x1f; ++z) {
    z !== 0x9 && z !== 0xa && z !== 0xd && assertReplaced(z);
  }
  for (let z = 0x7f; z <= 0x9f; ++z) assertReplaced(z);
});
Deno.test("uncode : lone surrogates", () => {
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
