import { assertEquals, assertMatch, assertNotMatch } from "@std/assert";
import fc from "fast-check";
import { enUtf8 } from "@libn/base";
import { A85, deA85, enA85 } from "@libn/base/a85";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("ref", () => {
  for (const $ of vectors.a85) {
    assertEquals(enA85(enUtf8($.binary)), $.string);
    assertEquals(deA85($.string), enUtf8($.binary));
  }
});
Deno.test("pbt", async (t) => {
  await t.step("round-trip", () =>
    fc.assert(fc.property(
      fc.uint8Array(),
      ($) => {
        assertEquals(deA85(enA85($)), $);
      },
    )));
  await t.step("match regex", () =>
    fc.assert(fc.property(
      fc.uint8Array(),
      ($) => {
        assertMatch(enA85($), A85);
      },
    )));
  await t.step("ignore invalid", () =>
    fc.assert(fc.property(
      fc.stringMatching(RegExp(A85.source.replaceAll("[", "[^"))),
      ($) => {
        assertEquals(deA85($), deA85($).fill(0));
      },
    )));
});
Deno.test("bdd", async (t) => {
  await t.step("enA85() encodes Ascii85", () => {
    assertEquals(enA85(new Uint8Array()), "");
    assertEquals(enA85(enUtf8("Hello world!")), "87cURD]j7BEbo80");
  });
  await t.step("deA85() decodes Ascii85", () => {
    assertEquals(deA85(""), new Uint8Array());
    assertEquals(deA85("87cURD]j7BEbo80"), enUtf8("Hello world!"));
  });
  await t.step("A85 matches Ascii85", () => {
    assertMatch(
      "!\"#$%&'()*+,-./0123456789:;<=>?@ABCDEFGHIJKLMNOPQRSTUVWXYZ[\\]^_`abcdefghijklmnopqrstu",
      A85,
    );
    for (const $ of "vwxyz{|}~") assertNotMatch($, A85);
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
