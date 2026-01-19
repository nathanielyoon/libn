import { B32, deB32, deH32, enB32, enH32, H32 } from "@libn/base/32";
import { untext } from "@libn/utf";
import { assertEquals, assertMatch, assertNotMatch } from "@std/assert";
import fc from "fast-check";
import { fcBin } from "../test.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("b32 : vectors", () => {
  for (const $ of vectors.b32) {
    assertEquals(enB32(untext($.binary)), $.string);
    assertEquals(deB32($.string), untext($.binary));
    assertMatch($.string, B32);
  }
});
Deno.test("b32 : binary", () => {
  fc.assert(fc.property(fcBin(), ($) => {
    const string = enB32($);
    assertMatch(string, B32);
    assertEquals(deB32(string), $);
  }));
});
Deno.test("b32.B32 : invalid base32", () => {
  for (const $ of "abcdefghijklmnopqrstuvwxyz0189") assertNotMatch($, B32);
});

Deno.test("h32 : vectors", () => {
  for (const $ of vectors.h32) {
    assertEquals(enH32(untext($.binary)), $.string);
    assertEquals(deH32($.string), untext($.binary));
    assertMatch($.string, H32);
  }
});
Deno.test("h32 : binary", () => {
  fc.assert(fc.property(fcBin(), ($) => {
    const string = enH32($);
    assertMatch(string, H32);
    assertEquals(deH32(string), $);
  }));
});
Deno.test("h32.H32 : invalid base32", () => {
  for (const $ of "abcdefghijklmnopqrstuvwxyzWXYZ") assertNotMatch($, H32);
});
