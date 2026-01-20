import { B16, deB16, enB16 } from "@libn/base/16";
import { untext } from "@libn/utf";
import { assertEquals, assertMatch, assertNotMatch } from "@std/assert";
import fc from "fast-check";
import { fcBin, fcStr } from "../test.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("enB16 : vectors", () => {
  for (const $ of vectors.b16) assertEquals(enB16(untext($.binary)), $.string);
});
Deno.test("deB16 : vectors", () => {
  for (const $ of vectors.b16) assertEquals(deB16($.string), untext($.binary));
});
Deno.test("B16 : vectors", () => {
  for (const $ of vectors.b16) assertMatch($.string, B16);
});
Deno.test("enB16-deB16 : fcBinary", () => {
  fc.assert(fc.property(fcBin(), ($) => {
    assertEquals(deB16(enB16($)), $);
  }));
});
Deno.test("enB16 :: built-in toHex", () => {
  fc.assert(fc.property(fcBin(), ($) => {
    assertEquals(enB16($), $.toHex().toUpperCase());
  }));
});
Deno.test("deB16 :: built-in fromHex", () => {
  fc.assert(fc.property(fcBin().map(enB16), ($) => {
    assertEquals(deB16($), Uint8Array.fromHex($));
  }));
});
Deno.test("B16 : invalid base16", () => {
  for (const $ of "abcdefGHIJKLMNOPQRSTUVWXYZghijklmnopqrstuvwxyz") {
    assertNotMatch($.repeat(2), B16);
  }
  fc.assert(fc.property(fcStr(`^.${B16.source.slice(1)}`), ($) => {
    assertNotMatch($, B16);
  }));
});
