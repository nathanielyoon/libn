import { assert, assertEquals } from "@std/assert";
import fc from "fast-check";
import { fc_binary, fc_check, read } from "@libn/lib";
import { chacha, stream } from "./src/chacha.ts";
import { poly } from "./src/poly.ts";
import { polyxchacha, xchachapoly } from "./src/aead.ts";
import { decrypt, encrypt, xchacha } from "./mod.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("chacha", async ({ step }) => {
  const get = ($: Uint8Array) =>
    [...new Uint32Array($.buffer)] as [number, number, number];
  await step("chacha : rfc8439 2.3.2/rfc 8439 A.1", () => {
    for (const $ of read(vectors.chacha["rfc8439 2.3.2/rfc8439 A.1"])) {
      const state = new Uint32Array(16);
      chacha(new Uint32Array($.key.buffer), $.count, ...get($.iv), state);
      assertEquals(new Uint8Array(state.buffer), $.state);
    }
  });
  await step("xor : rfc8439 2.4.2/rfc8439 A.2", () => {
    for (const $ of read(vectors.chacha["rfc8439 2.4.2/rfc8439 A.2"])) {
      stream(new Uint32Array($.key.buffer), ...get($.iv), $.plaintext, $.count);
      assertEquals($.plaintext, $.ciphertext);
    }
  });
  await step("chacha : rfc8439 2.6.2/rfc8439 A.4", () => {
    for (const $ of read(vectors.chacha["rfc8439 2.6.2/rfc8439 A.4"])) {
      const state = new Uint32Array(16);
      chacha(new Uint32Array($.key.buffer), 0, ...get($.iv), state);
      assertEquals(new Uint8Array(state.buffer).subarray(0, 32), $.subkey);
    }
  });
  await step("hchacha : xchacha-03 A.3.2.1", () => {
    for (const $ of read(vectors.chacha.xchacha)) {
      const text = new Uint8Array($.plaintext.length);
      xchacha($.key, $.iv, text);
      assertEquals(text, $.keystream);
      text.set($.plaintext);
      xchacha($.key, $.iv, text);
      assertEquals(text, $.ciphertext);
    }
  });
});
Deno.test("poly", async ({ step }) => {
  await step("poly : rfc8439 2.5.2/rfc8439 A.3", () => {
    for (const $ of read(vectors.poly["rfc8439 2.5.2/rfc8439 A.3"])) {
      assertEquals(poly(new Uint32Array($.key.buffer), $.message), $.tag);
    }
  });
  await step("poly : poly1305donna", () => {
    for (const $ of read(vectors.poly.donna)) {
      assertEquals(poly(new Uint32Array($.key.buffer), $.message), $.tag);
    }
  });
});
const fc_wrong = ($: number) =>
  fc.oneof(fc_binary({ maxLength: $ - 1 }), fc_binary({ minLength: $ + 1 }));
const fc_at_least_one_wrong = <const A extends number[]>(...lengths: A) =>
  fc.oneof(...Array.from(lengths, (_, index) =>
    fc.tuple(
      ...lengths.map(($, z) =>
        z !== index
          ? fc.oneof(fc_binary({ minLength: $, maxLength: $ }), fc_wrong($))
          : fc_wrong($)
      ),
    )));
Deno.test("aead", async ({ step }) => {
  await step("xchachapoly/polyxchacha : wycheproof", () => {
    for (const $ of read(vectors.aead.wycheproof)) {
      if ($.result) {
        const text = new Uint8Array($.plaintext);
        assertEquals(xchachapoly($.key, $.iv, text, $.associated_data), $.tag);
        assertEquals(text, $.ciphertext);
        assert(polyxchacha($.key, $.iv, $.tag, text, $.associated_data));
        assertEquals(text, $.plaintext);
      } else {
        assert(
          !polyxchacha($.key, $.iv, $.tag, $.ciphertext, $.associated_data),
        );
      }
    }
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
Deno.test("mod", async ({ step }) => {
  await step("encrypt/decrypt : arbitrary round-trip", () => {
    fc_check(fc.property(
      fc_binary(32),
      fc_binary(),
      fc_binary(),
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
      fc_wrong(32),
      fc_binary(),
      fc_binary(),
      (key, $, data) => {
        assertEquals(encrypt(key, $, data), null);
        assertEquals(decrypt(key, $, data), null);
      },
    ));
  });
});
