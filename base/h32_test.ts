import { assertEquals, assertMatch, assertNotMatch } from "@std/assert";
import fc from "fast-check";
import { enUtf8 } from "@libn/base";
import { deH32, enH32, H32 } from "@libn/base/h32";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("ref", () => {
  for (const $ of vectors.H32) {
    assertEquals(enH32(enUtf8($.binary)), $.string);
    assertEquals(deH32($.string), enUtf8($.binary));
  }
});
Deno.test("pbt", async (t) => {
  await t.step("round-trip", () =>
    fc.assert(fc.property(
      fc.uint8Array(),
      ($) => {
        assertEquals(deH32(enH32($)), $);
      },
    )));
  await t.step("match regex", () =>
    fc.assert(fc.property(
      fc.uint8Array(),
      ($) => {
        assertMatch(enH32($), H32);
      },
    )));
  await t.step("ignore invalid", () =>
    fc.assert(fc.property(
      fc.stringMatching(RegExp(H32.source.replaceAll("[", "[^"))),
      ($) => {
        assertEquals(deH32($), deH32($).fill(0));
      },
    )));
});
Deno.test("bdd", async (t) => {
  await t.step("enH32() encodes base32hex", () => {
    assertEquals(enH32(enUtf8("Hello world!")), "91IMOR3F41RMUSJCCGGG");
  });
  await t.step("deH32() decodes base32hex", () => {
    assertEquals(deH32("91IMOR3F41RMUSJCCGGG"), enUtf8("Hello world!"));
  });
  await t.step("H32 matches base32hex", () => {
    assertMatch("0123456789ABCDEFGHIJKLMNOPQRSTUV", H32);
    assertNotMatch("W", H32);
    assertNotMatch("w", H32);
    assertNotMatch("X", H32);
    assertNotMatch("x", H32);
    assertNotMatch("Y", H32);
    assertNotMatch("y", H32);
    assertNotMatch("Z", H32);
    assertNotMatch("z", H32);
  });
});
