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
import { assertEquals, assertMatch, assertNotMatch } from "@std/assert";
import { untext } from "@libn/utf";
import vectors from "./vectors.json" with { type: "json" };
import { fcBin } from "../test.ts";

Deno.test("enB64 : vectors", () => {
  for (const $ of vectors.b64) {
    assertEquals(enPad(enB64(untext($.binary))), $.string);
    assertEquals(enB64(untext($.binary)), dePad($.string));
  }
});
Deno.test("deB64 : vectors", () => {
  for (const $ of vectors.b64) {
    assertEquals(deB64(dePad($.string)), untext($.binary));
  }
});
Deno.test("B64 : vectors", () => {
  for (const $ of vectors.b64) assertMatch(dePad($.string), B64);
});
Deno.test("enB64-deB64 : fcBin", () => {
  fc.assert(fc.property(fcBin(), ($) => {
    assertEquals(deB64(enB64($)), $);
  }));
});
Deno.test("enB64 :: built-in toBase64", () => {
  fc.assert(fc.property(fcBin(), ($) => {
    assertEquals(enB64($), dePad($.toBase64()));
    assertEquals(enPad(enB64($)), $.toBase64());
  }));
});
Deno.test("deB64 :: built-in fromBase64", () => {
  fc.assert(fc.property(fcBin().map(enB64), ($) => {
    assertEquals(deB64($), Uint8Array.fromBase64($));
  }));
});
Deno.test("B64 : invalid base64", () => {
  for (const $ of "-_") assertNotMatch(`AAA${$}`, B64);
  assertNotMatch("A", B64);
});

Deno.test("enU64 : vectors", () => {
  for (const $ of vectors.u64) assertEquals(enU64(untext($.binary)), $.string);
});
Deno.test("deU64 : vectors", () => {
  for (const $ of vectors.u64) assertEquals(deU64($.string), untext($.binary));
});
Deno.test("U64 : vectors", () => {
  for (const $ of vectors.u64) assertMatch($.string, U64);
});
Deno.test("enU64-deU64 : fcBin", () => {
  fc.assert(fc.property(fcBin(), ($) => {
    assertEquals(deU64(enU64($)), $);
  }));
});
Deno.test("enU64 :: built-in toBase64", () => {
  fc.assert(fc.property(fcBin(), ($) => {
    assertEquals(enU64($), dePad($.toBase64({ alphabet: "base64url" })));
    assertEquals(enPad(enU64($)), $.toBase64({ alphabet: "base64url" }));
  }));
});
Deno.test("deU64 :: built-in fromBase64", () => {
  fc.assert(fc.property(fcBin().map(enU64), ($) => {
    assertEquals(deU64($), Uint8Array.fromBase64($, { alphabet: "base64url" }));
  }));
});
Deno.test("U64 : invalid base64url", () => {
  for (const $ of "+/=") assertNotMatch(`AAA${$}`, U64);
  assertNotMatch("A", U64);
});
