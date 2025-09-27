import { assertEquals } from "@std/assert";
import fc from "fast-check";
import { bundle, fc_binary, fc_check, fc_string } from "@libn/lib";
import type { Decode, Encode } from "./src/common.ts";
import { de_b16, en_b16 } from "./src/16.ts";
import {
  de_b32,
  de_c32,
  de_h32,
  de_z32,
  en_b32,
  en_c32,
  en_h32,
  en_z32,
} from "./src/32.ts";
import { de_b64, de_u64, en_b64, en_u64 } from "./src/64.ts";
import { de_bin, en_bin } from "./mod.ts";
import vectors from "./vectors.json" with { type: "json" };

const all = (encode: Encode, decode: Decode) =>
  fc_check(fc.property(fc_binary(), ($) => assertEquals(decode(encode($)), $)));
Deno.test("16", async ({ step }) => {
  await step("en_b16/de_b16 : rfc4648 10", () => {
    for (const $ of vectors.rfc4648.base16) {
      assertEquals(en_b16(en_bin($.ascii)), $.binary);
      assertEquals(de_bin(de_b16($.binary)), $.ascii);
    }
  });
  await step("en_b16/de_b16 : arbitrary round-trip", () => all(en_b16, de_b16));
});
Deno.test("32", async ({ step }) => {
  await step("en_b32/de_b32 : rfc4648 10", () => {
    for (const $ of vectors.rfc4648.base32) {
      assertEquals(en_b32(en_bin($.ascii)), $.binary);
      assertEquals(de_bin(de_b32($.binary)), $.ascii);
    }
  });
  await step("en_h32/de_h32 : rfc4648 10", () => {
    for (const $ of vectors.rfc4648.base32hex) {
      assertEquals(en_h32(en_bin($.ascii)), $.binary);
      assertEquals(de_bin(de_h32($.binary)), $.ascii);
    }
  });
  await step("en_b32/de_b32 : arbitrary round-trip", () => all(en_b32, de_b32));
  await step("en_h32/de_h32 : arbitrary round-trip", () => all(en_h32, de_h32));
  await step("en_z32/de_z32 : arbitrary round-trip", () => all(en_z32, de_z32));
  await step("en_c32/de_c32 : arbitrary round-trip", () => all(en_c32, de_c32));
});
Deno.test("64", async ({ step }) => {
  await step("en_b64/de_b64 : rfc4648 10", () => {
    for (const $ of vectors.rfc4648.base64) {
      assertEquals(en_b64(en_bin($.ascii)), $.binary);
      assertEquals(de_bin(de_b64($.binary)), $.ascii);
    }
  });
  await step("en_u64/de_u64 : rfc4648 10", () => {
    for (const $ of vectors.rfc4648.base64url) {
      assertEquals(en_u64(en_bin($.ascii)), $.binary);
      assertEquals(de_bin(de_u64($.binary)), $.ascii);
    }
  });
  await step("en_b64/de_b64 : arbitrary round-trip", () => all(en_b64, de_b64));
  await step("en_u64/de_u64 : arbitrary round-trip", () => all(en_u64, de_u64));
});
Deno.test("mod", async ({ step }) => {
  await step("en_bin/de_bin :: separate instantiations and calls", () => {
    fc_check(fc.property(
      fc_string(),
      ($) => assertEquals(en_bin($), new TextEncoder().encode($)),
    ));
    fc_check(fc.property(
      fc_binary(),
      ($) => assertEquals(de_bin($), new TextDecoder().decode($)),
    ));
  });
  await step("bundle : pure", async () => {
    assertEquals(await bundle(import.meta), "");
  });
});
