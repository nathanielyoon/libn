import {
  assertEquals,
  assertMatch,
  assertNotMatch,
  assertThrows,
} from "@std/assert";
import fc from "fast-check";
import { enUtf8 } from "@libn/base";
import { B64, deB64, enB64 } from "@libn/base/b64";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("ref", () => {
  for (const $ of vectors.b64) {
    assertEquals(enB64(enUtf8($.binary)), $.string);
    assertEquals(deB64($.string), enUtf8($.binary));
    assertEquals(deB64($.string + "="), enUtf8($.binary));
  }
});
Deno.test("pbt", async (t) => {
  await t.step("round-trip", () =>
    fc.assert(fc.property(
      fc.uint8Array(),
      ($) => {
        assertEquals(deB64(enB64($)), $);
      },
    )));
  await t.step("match regex", () =>
    fc.assert(fc.property(
      fc.uint8Array(),
      ($) => {
        assertMatch(enB64($), B64);
      },
    )));
  await t.step("ignore invalid", () =>
    fc.assert(fc.property(
      fc.stringMatching(RegExp(B64.source.replaceAll("[", "[^"))),
      ($) => {
        assertEquals(deB64($), deB64($).fill(0));
      },
    )));
  await t.step("follow built-in", () =>
    fc.assert(fc.property(
      fc.uint8Array(),
      ($) => {
        assertEquals(enB64($), $.toBase64());
        assertEquals(deB64($.toBase64()), Uint8Array.fromBase64($.toBase64()));
      },
    )));
});
Deno.test("bdd", async (t) => {
  await t.step("enB64() encodes base64", () => {
    assertEquals(enB64(new Uint8Array()), "");
    assertEquals(enB64(enUtf8("Hello world!")), "SGVsbG8gd29ybGQh");
  });
  await t.step("deB64() decodes base64", () => {
    assertEquals(deB64(""), new Uint8Array());
    assertEquals(deB64("SGVsbG8gd29ybGQh"), enUtf8("Hello world!"));
  });
  await t.step("B64 matches base64", () => {
    assertMatch(
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/",
      B64,
    );
    assertNotMatch("=", B64);
    assertNotMatch("AA=", B64);
    assertNotMatch("AAA==", B64);
  });
  await t.step("deB64() falls back when atob fails", () => {
    assertThrows(() => atob("="));
    assertEquals(deB64("="), new Uint8Array([]));
    assertThrows(() => atob("AA="));
    assertEquals(deB64("AA="), new Uint8Array([0]));
    assertThrows(() => atob("AAA=="));
    assertEquals(deB64("AAA=="), new Uint8Array([0, 0]));
  });
});
