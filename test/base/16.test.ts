import { B16, deB16, enB16 } from "@libn/base/16";
import fc from "fast-check";
import { assertEquals, assertMatch, assertNotMatch } from "@std/assert";
import { untext } from "@libn/utf";
import vectors from "./vectors.json" with { type: "json" };
import { fcBin, fcStr } from "../test.ts";

Deno.test("b16 : vectors", () => {
  for (const $ of vectors.b16) {
    assertEquals(enB16(untext($.binary)), $.string);
    assertEquals(deB16($.string), untext($.binary));
    assertMatch($.string, B16);
  }
});
Deno.test("b16 : binary", () => {
  fc.assert(fc.property(fcBin(), ($) => {
    const string = enB16($);
    assertMatch(string, B16);
    assertEquals(deB16(string), $);
  }));
});
Deno.test("b16.enB16 :: built-in toHex", () => {
  fc.assert(fc.property(fcBin(), ($) => {
    assertEquals(enB16($), $.toHex().toUpperCase());
  }));
});
Deno.test("b16.deB16 :: built-in fromHex", () => {
  fc.assert(fc.property(fcBin().map(enB16), ($) => {
    assertEquals(deB16($), Uint8Array.fromHex($));
  }));
});
Deno.test("b16.B16 : invalid base16", () => {
  for (const $ of "abcdefGHIJKLMNOPQRSTUVWXYZghijklmnopqrstuvwxyz") {
    assertNotMatch($.repeat(2), B16);
  }
  fc.assert(fc.property(fcStr(`^.${B16.source.slice(1)}`), ($) => {
    assertNotMatch($, B16);
  }));
});
