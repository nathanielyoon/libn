import { assertEquals, assertMatch, assertNotMatch } from "@std/assert";
import fc from "fast-check";
import { enUtf8 } from "@libn/base";
import { B16, deB16, enB16 } from "@libn/base/b16";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("ref", () => {
  for (const $ of vectors.B16) {
    const binary = enUtf8($.binary);
    assertEquals(enB16(binary), $.string);
    assertEquals(deB16($.string), binary);
  }
});
Deno.test("pbt", async (t) => {
  await t.step("round-trip", () =>
    fc.assert(fc.property(
      fc.uint8Array(),
      ($) => {
        assertEquals(deB16(enB16($)), $);
      },
    )));
  await t.step("match regex", () =>
    fc.assert(fc.property(
      fc.uint8Array(),
      ($) => {
        assertMatch(enB16($), B16);
      },
    )));
  await t.step("ignore invalid", () =>
    fc.assert(fc.property(
      fc.stringMatching(RegExp(B16.source.replaceAll("[", "[^"))),
      ($) => {
        assertEquals(deB16($), deB16($).fill(0));
      },
    )));
  await t.step("match built-in", () =>
    fc.assert(fc.property(
      fc.uint8Array(),
      ($) => {
        assertEquals(enB16($), $.toHex().toUpperCase());
        assertEquals(deB16($.toHex()), Uint8Array.fromHex($.toHex()));
      },
    )));
  await t.step("skip end of odd-length strings", () =>
    fc.assert(fc.property(
      fc.stringMatching(B16),
      fc.string({ minLength: 1, maxLength: 1 }),
      ($, extra) => {
        assertEquals(deB16($ + extra), deB16($));
      },
    )));
});
Deno.test("bdd", async (t) => {
  await t.step("enB16() encodes base16", () => {
    assertEquals(enB16(new Uint8Array()), "");
    assertEquals(enB16(enUtf8("Hello world!")), "48656C6C6F20776F726C6421");
  });
  await t.step("deB16() decodes base16", () => {
    assertEquals(deB16(""), new Uint8Array());
    assertEquals(deB16("48656C6C6F20776F726C6421"), enUtf8("Hello world!"));
  });
  await t.step("B16 matches base16", () => {
    assertMatch("0123456789ABCDEF", B16);
    for (const $ of "GHIJKLMNOPQRSTUVWXYZ") assertNotMatch($.repeat(2), B16);
  });
});
