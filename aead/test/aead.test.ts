import { assert, assertEquals } from "@std/assert";
import fc from "fast-check";
import { fc_binary, fc_check, read } from "@libn/lib";
import { polyxchacha, xchachapoly } from "../src/aead.ts";
import vectors from "./vectors.json" with { type: "json" };

const fc_at_least_one_wrong = <const A extends number[]>(...lengths: A) =>
  fc.oneof(...Array.from(lengths, (_, index) =>
    fc.tuple(
      ...lengths.map(($, z) =>
        z !== index
          ? fc.oneof(fc_binary({ minLength: $, maxLength: $ }), fc_binary(-$))
          : fc_binary(-$)
      ),
    )));
Deno.test("aead", async ({ step }) => {
  await step("xchachapoly/polyxchacha : wycheproof", () => {
    for (const $ of read(vectors.aead.wycheproof)) {
      if ($.result) {
        const text = new Uint8Array($.plaintext);
        assertEquals(xchachapoly($.key, $.iv, text, $.ad), $.tag);
        assertEquals(text, $.ciphertext);
        assert(polyxchacha($.key, $.iv, $.tag, text, $.ad));
        assertEquals(text, $.plaintext);
      } else {
        assert(
          !polyxchacha($.key, $.iv, $.tag, $.ciphertext, $.ad),
        );
      }
    }
  });
  await step("xchachapoly/polyxchacha : xchacha-03 A.3.1", () => {
    const [$] = read(vectors.aead["xchacha-03 A.3.1"]);
    const text = new Uint8Array($.plaintext);
    assertEquals(xchachapoly($.key, $.iv, text, $.ad), $.tag);
    assertEquals(text, $.ciphertext);
    assert(polyxchacha($.key, $.iv, $.tag, text, $.ad));
    assertEquals(text, $.plaintext);
  });
  await step("xchachapoly : wrong-size arguments", () => {
    fc_check(fc.property(
      fc_at_least_one_wrong(32, 24),
      fc_binary(),
      fc_binary(),
      ([key, iv], plaintext, data) =>
        assertEquals(xchachapoly(key, iv, plaintext, data), null),
    ));
  });
  await step("polyxchacha : wrong-size arguments", () => {
    fc_check(fc.property(
      fc_at_least_one_wrong(32, 24, 16),
      fc_binary(),
      fc_binary(),
      ([key, iv, tag], ciphertext, data) =>
        assertEquals(polyxchacha(key, iv, tag, ciphertext, data), false),
    ));
  });
});
