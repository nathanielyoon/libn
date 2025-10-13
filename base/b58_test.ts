import { assertEquals, assertMatch, assertNotMatch } from "@std/assert";
import fc from "fast-check";
import { enUtf8 } from "@libn/base";
import { B58, deB58, enB58 } from "@libn/base/b58";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("ref", () => {
  for (const $ of vectors.b58) {
    assertEquals(enB58(Uint8Array.fromHex($.binary)), $.string);
    assertEquals(deB58($.string), Uint8Array.fromHex($.binary));
  }
});
Deno.test("pbt", async (t) => {
  await t.step("round-trip", () =>
    fc.assert(fc.property(
      fc.uint8Array(),
      ($) => {
        assertEquals(deB58(enB58($)), $);
      },
    )));
  await t.step("match regex", () =>
    fc.assert(fc.property(
      fc.uint8Array(),
      ($) => {
        assertMatch(enB58($), B58);
      },
    )));
  await t.step("ignore invalid", () =>
    fc.assert(fc.property(
      fc.stringMatching(RegExp(B58.source.replaceAll("[", "[^"))),
      ($) => {
        assertEquals(deB58($), deB58($).fill(0));
      },
    )));
});
Deno.test("bdd", async (t) => {
  await t.step("enB58() encodes base58", () => {
    assertEquals(enB58(new Uint8Array()), "");
    assertEquals(enB58(enUtf8("Hello world!")), "2NEpo7TZRhna7vSvL");
  });
  await t.step("deB58() decodes base58", () => {
    assertEquals(deB58(""), new Uint8Array());
    assertEquals(deB58("2NEpo7TZRhna7vSvL"), enUtf8("Hello world!"));
  });
  await t.step("B58 matches base58", () => {
    assertMatch(
      "123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz",
      B58,
    );
    for (const $ of "0IOl") assertNotMatch($, B58);
  });
});
