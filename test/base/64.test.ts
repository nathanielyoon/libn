import {
  B64,
  deB64,
  dePad,
  deU64,
  enB64,
  enPad,
  enU64,
  U64,
} from "@libn/base/64";
import fc from "fast-check";
import {
  assertEquals,
  assertMatch,
  assertNotMatch,
  assertThrows,
} from "@std/assert";
import { untext } from "@libn/utf";
import vectors from "./vectors.json" with { type: "json" };
import { fcBin } from "../test.ts";

Deno.test("b64 : vectors", () => {
  for (const $ of vectors.b64) {
    assertEquals(enPad(enB64(untext($.binary))), $.string);
    assertEquals(deB64(dePad($.string)), untext($.binary));
    assertMatch(dePad($.string), B64);
  }
});
Deno.test("b64 : binary", () => {
  fc.assert(fc.property(fcBin(), ($) => {
    const string = enB64($);
    assertMatch(string, B64);
    assertEquals(deB64(string), $);
  }));
});
Deno.test("b64.enB64 :: built-in toBase64", () => {
  fc.assert(fc.property(fcBin(), ($) => {
    assertEquals(enB64($), $.toBase64({ omitPadding: true }));
    assertEquals(enPad(enB64($)), $.toBase64());
  }));
});
Deno.test("b64.deB64 :: built-in fromBase64", () => {
  fc.assert(fc.property(fcBin().map(enB64), ($) => {
    assertEquals(deB64($), Uint8Array.fromBase64($));
  }));
});
Deno.test("b64.B64 : invalid base64", () => {
  for (const $ of "-_") assertNotMatch(`AAA${$}`, B64);
  assertNotMatch("A", B64);
});

Deno.test("u64 : vectors", () => {
  for (const $ of vectors.u64) {
    assertEquals(enU64(untext($.binary)), $.string);
    assertEquals(deU64($.string), untext($.binary));
    assertMatch($.string, U64);
  }
});
Deno.test("u64 : binary", () => {
  fc.assert(fc.property(fcBin(), ($) => {
    const string = enU64($);
    assertMatch(string, U64);
    assertEquals(deU64(string), $);
  }));
});
Deno.test("u64.enU64 :: built-in toBase64", () => {
  fc.assert(fc.property(fcBin(), ($) => {
    assertEquals(
      enU64($),
      $.toBase64({ alphabet: "base64url", omitPadding: true }),
    );
    assertEquals(enPad(enU64($)), $.toBase64({ alphabet: "base64url" }));
  }));
});
Deno.test("u64.deU64 :: built-in fromBase64", () => {
  fc.assert(fc.property(fcBin().map(enU64), ($) => {
    assertEquals(deU64($), Uint8Array.fromBase64($, { alphabet: "base64url" }));
  }));
});
Deno.test("u64.U64 : invalid base64url", () => {
  for (const $ of "+/=") assertNotMatch(`AAA${$}`, U64);
  assertNotMatch("A", U64);
});
