import { B32, deB32, deH32, enB32, enH32, H32 } from "@libn/base/32";
import { untext } from "@libn/utf";
import { assertEquals, assertMatch, assertNotMatch } from "@std/assert";
import fc from "fast-check";
import { fcBin } from "../test.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("enB32 : vectors", () => {
  for (const $ of vectors.b32) assertEquals(enB32(untext($.binary)), $.string);
});
Deno.test("deB32 : vectors", () => {
  for (const $ of vectors.b32) assertEquals(deB32($.string), untext($.binary));
});
Deno.test("B32 : vectors", () => {
  for (const $ of vectors.b32) assertMatch($.string, B32);
});
Deno.test("enB32-deB32 : fcBin", () => {
  fc.assert(fc.property(fcBin(), ($) => {
    assertEquals(deB32(enB32($)), $);
  }));
});
Deno.test("B32 : invalid base32", () => {
  for (const $ of "abcdefghijklmnopqrstuvwxyz0189") assertNotMatch($, B32);
});

Deno.test("enH32 : vectors", () => {
  for (const $ of vectors.h32) assertEquals(enH32(untext($.binary)), $.string);
});
Deno.test("deH32 : vectors", () => {
  for (const $ of vectors.h32) assertEquals(deH32($.string), untext($.binary));
});
Deno.test("H32 : vectors", () => {
  for (const $ of vectors.h32) assertMatch($.string, H32);
});
Deno.test("enH32-deH32 : fcBin", () => {
  fc.assert(fc.property(fcBin(), ($) => {
    assertEquals(deH32(enH32($)), $);
  }));
});
Deno.test("H32 : invalid base32", () => {
  for (const $ of "abcdefghijklmnopqrstuvwxyzWXYZ") assertNotMatch($, H32);
});
