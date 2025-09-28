import { assert } from "@std/assert";
import { assertEquals } from "@std/assert/equals";
import fc from "fast-check";
import { fc_bin, fc_check, pure, read } from "@libn/lib";
import { cipher, decrypt, encrypt } from "../mod.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("mod", async ({ step }) => {
  await step("cipher : xchacha-03 A.3.2.1", () => {
    for (const $ of read(vectors.mod["xchacha-03 A.3.2.1"])) {
      const text = new Uint8Array($.plaintext.length);
      cipher($.key, $.iv, text);
      assertEquals(text, $.keystream);
      text.set($.plaintext);
      cipher($.key, $.iv, text);
      assertEquals(text, $.ciphertext);
    }
  });
  await step("encrypt/decrypt : arbitrary round-trip", () => {
    fc_check(fc.property(
      fc_bin(32),
      fc_bin(),
      fc_bin(),
      (key, plaintext, data) => {
        const text_1 = encrypt(key, plaintext, data);
        assert(text_1);
        assertEquals(decrypt(key, text_1, data)!, plaintext);
        const text_2 = encrypt(key, plaintext);
        assert(text_2);
        assertEquals(decrypt(key, text_2), plaintext);
      },
    ));
  });
  await step("encrypt/decrypt : wrong-size arguments", () => {
    fc_check(fc.property(
      fc_bin(-32),
      fc_bin(),
      fc_bin(),
      (key, $, data) => {
        assertEquals(encrypt(key, $, data), null);
        assertEquals(decrypt(key, $, data), null);
      },
    ));
  });
  await step("bundle : pure", pure);
});
