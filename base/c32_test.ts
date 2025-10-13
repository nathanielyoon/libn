import { assertEquals, assertMatch, assertNotMatch } from "@std/assert";
import fc from "fast-check";
import { enUtf8 } from "@libn/base";
import { C32, deC32, enC32 } from "@libn/base/c32";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("ref", () => {
  for (const $ of vectors.C32) {
    assertEquals(enC32(Uint8Array.fromHex($.binary)), $.string);
    assertEquals(deC32($.string), Uint8Array.fromHex($.binary));
    assertEquals(deC32($.string + "-"), Uint8Array.fromHex($.binary));
  }
});
Deno.test("pbt", async (t) => {
  await t.step("round-trip", () =>
    fc.assert(fc.property(
      fc.uint8Array(),
      ($) => {
        assertEquals(deC32(enC32($)), $);
      },
    )));
  await t.step("match regex", () =>
    fc.assert(fc.property(
      fc.uint8Array(),
      ($) => {
        assertMatch(enC32($), C32);
      },
    )));
  await t.step("ignore invalid", () =>
    fc.assert(fc.property(
      fc.stringMatching(RegExp(C32.source.replaceAll("[", "[^"))),
      ($) => {
        assertEquals(deC32($), deC32($).fill(0));
      },
    )));
  await t.step("accept similar", () =>
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
      },
    )));
  await t.step("accept hyphens", () =>
    fc.assert(fc.property(
      fc.stringMatching(C32),
      ($) => {
        assertEquals(deC32($), deC32($.replaceAll("-", "")));
      },
    )));
});
Deno.test("bdd", async (t) => {
  await t.step("enC32() encodes Crockford base32", () => {
    assertEquals(enC32(new Uint8Array()), "");
    assertEquals(enC32(enUtf8("Hello world!")), "91JPRV3F41VPYWKCCGGG");
  });
  await t.step("deC32() decodes Crockford base32", () => {
    assertEquals(deC32(""), new Uint8Array());
    assertEquals(deC32("91JPRV3F41VPYWKCCGGG"), enUtf8("Hello world!"));
  });
  await t.step("C32 matches Crockford base32", () => {
    assertMatch("0123456789ABCDEFGHJKMNPQRSTVWXYZ", C32);
    assertNotMatch("U", C32);
    assertNotMatch("u", C32);
  });
  await t.step("deC32() handles extra characters", () => {
    assertEquals(deC32("Oo-IiLl"), deC32("001111"));
  });
});
