import { assertEquals, assertMatch, assertNotMatch } from "@std/assert";
import fc from "fast-check";
import { enUtf8 } from "@libn/base";
import { deU64, enU64, U64 } from "@libn/base/u64";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("ref", () => {
  for (const $ of vectors.u64) {
    assertEquals(enU64(enUtf8($.binary)), $.string);
    assertEquals(deU64($.string), enUtf8($.binary));
  }
});
Deno.test("pbt", async (t) => {
  await t.step("round-trip", () =>
    fc.assert(fc.property(
      fc.uint8Array(),
      ($) => {
        assertEquals(deU64(enU64($)), $);
      },
    )));
  await t.step("match regex", () =>
    fc.assert(fc.property(
      fc.uint8Array(),
      ($) => {
        assertMatch(enU64($), U64);
      },
    )));
  await t.step("ignore invalid", () =>
    fc.assert(fc.property(
      fc.stringMatching(RegExp(U64.source.replaceAll("[", "[^"))),
      ($) => {
        assertEquals(deU64($), deU64($).fill(0));
      },
    )));
  await t.step("follow built-in", () =>
    fc.assert(fc.property(
      fc.uint8Array(),
      ($) => {
        assertEquals(
          enU64($),
          $.toBase64({ alphabet: "base64url", omitPadding: true }),
        );
        assertEquals(
          deU64($.toBase64({ alphabet: "base64url", omitPadding: true })),
          Uint8Array.fromBase64(
            $.toBase64({ alphabet: "base64url", omitPadding: true }),
            { alphabet: "base64url" },
          ),
        );
      },
    )));
});
Deno.test("bdd", async (t) => {
  await t.step("enU64() encodes base64url", () => {
    assertEquals(enU64(new Uint8Array()), "");
    assertEquals(enU64(enUtf8("Hello world!")), "SGVsbG8gd29ybGQh");
  });
  await t.step("deU64() decodes base64url", () => {
    assertEquals(deU64(""), new Uint8Array());
    assertEquals(deU64("SGVsbG8gd29ybGQh"), enUtf8("Hello world!"));
  });
  await t.step("U64 matches base64url", () => {
    assertMatch(
      "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_",
      U64,
    );
    for (const $ of "+/=") assertNotMatch($, U64);
  });
});
