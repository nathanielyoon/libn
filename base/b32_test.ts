import { assertEquals, assertMatch, assertNotMatch } from "@std/assert";
import fc from "fast-check";
import { enUtf8 } from "@libn/base";
import { B32, deB32, enB32 } from "@libn/base/b32";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("ref", () => {
  for (const $ of vectors.b32) {
    assertEquals(enB32(enUtf8($.binary)), $.string);
    assertEquals(deB32($.string), enUtf8($.binary));
  }
});
Deno.test("pbt", async (t) => {
  await t.step("round-trip", () =>
    fc.assert(fc.property(
      fc.uint8Array(),
      ($) => {
        assertEquals(deB32(enB32($)), $);
      },
    )));
  await t.step("match regex", () =>
    fc.assert(fc.property(
      fc.uint8Array(),
      ($) => {
        assertMatch(enB32($), B32);
      },
    )));
  await t.step("ignore invalid", () =>
    fc.assert(fc.property(
      fc.stringMatching(RegExp(B32.source.replaceAll("[", "[^"))),
      ($) => {
        assertEquals(deB32($), deB32($).fill(0));
      },
    )));
});
Deno.test("bdd", async (t) => {
  await t.step("enB32() encodes base32", () => {
    assertEquals(enB32(enUtf8("Hello world!")), "JBSWY3DPEB3W64TMMQQQ");
  });
  await t.step("deB32() decodes base32", () => {
    assertEquals(deB32("JBSWY3DPEB3W64TMMQQQ"), enUtf8("Hello world!"));
  });
  await t.step("B32 matches base32", () => {
    assertMatch("ABCDEFGHIJKLMNOPQRSTUVWXYZ234567", B32);
    for (const $ of "0189") assertNotMatch($, B32);
  });
});
