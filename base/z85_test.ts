import { assertEquals, assertMatch, assertNotMatch } from "@std/assert";
import fc from "fast-check";
import { enUtf8 } from "@libn/base";
import { deZ85, enZ85, Z85 } from "@libn/base/z85";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("ref", () => {
  for (const $ of vectors.z85) {
    assertEquals(enZ85(Uint8Array.fromHex($.binary)), $.string);
    assertEquals(deZ85($.string), Uint8Array.fromHex($.binary));
  }
});
Deno.test("pbt", async (t) => {
  await t.step("round-trip", () =>
    fc.assert(fc.property(
      fc.integer({ min: 0, max: 1e3 }).chain(($) =>
        fc.uint8Array({ minLength: $ >> 2 << 2, maxLength: $ >> 2 << 2 })
      ),
      ($) => {
        assertEquals(deZ85(enZ85($)), $);
      },
    )));
  await t.step("match regex", () =>
    fc.assert(fc.property(
      fc.uint8Array(),
      ($) => {
        assertMatch(enZ85($), Z85);
      },
    )));
  await t.step("ignore invalid", () =>
    fc.assert(fc.property(
      fc.stringMatching(RegExp(Z85.source.replaceAll("[", "[^"))),
      ($) => {
        assertEquals(deZ85($), deZ85($).fill(0));
      },
    )));
});
Deno.test("bdd", async (t) => {
  await t.step("enZ85() encodes Z85", () => {
    assertEquals(enZ85(enUtf8("Hello world!")), "nm=QNzY<mxA+]nf");
  });
  await t.step("deZ85() decodes Z85", () => {
    assertEquals(deZ85("nm=QNzY<mxA+]nf"), enUtf8("Hello world!"));
  });
  await t.step("Z85 matches Z85", () => {
    assertMatch(
      "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ.-:+=^!/*?&<>()[]{}@%$#",
      Z85,
    );
    for (const $ of "\"',;\\_`") assertNotMatch($, Z85);
  });
});
