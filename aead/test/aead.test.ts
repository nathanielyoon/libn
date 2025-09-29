import { assert, assertEquals } from "@std/assert";
import fc from "fast-check";
import { fc_assert, fc_bin, read } from "@libn/lib";
import { polyxchacha, xchachapoly } from "../src/aead.ts";
import vectors from "./vectors.json" with { type: "json" };

const fc_at_least_one_wrong = <const A extends number[]>(...lengths: A) =>
  fc.oneof(...Array.from(lengths, (_, index) =>
    fc.tuple(
      ...lengths.map(($, z) =>
        z !== index
          ? fc.oneof(fc_bin({ minLength: $, maxLength: $ }), fc_bin(-$))
          : fc_bin(-$)
      ),
    )));
Deno.test("xchachapoly/polyxchacha : wycheproof", () =>
  read(vectors.aead.wycheproof).forEach(($) => {
    if ($.result) {
      const text = new Uint8Array($.plaintext);
      assertEquals(xchachapoly($.key, $.iv, text, $.ad), $.tag);
      assertEquals(text, $.ciphertext);
      assert(polyxchacha($.key, $.iv, $.tag, text, $.ad));
      assertEquals(text, $.plaintext);
    } else assert(!polyxchacha($.key, $.iv, $.tag, $.ciphertext, $.ad));
  }));
Deno.test("xchachapoly/polyxchacha : xchacha-03 A.3.1", () =>
  read(vectors.aead["xchacha-03 A.3.1"]).forEach(($) => {
    const text = new Uint8Array($.plaintext);
    assertEquals(xchachapoly($.key, $.iv, text, $.ad), $.tag);
    assertEquals(text, $.ciphertext);
    assert(polyxchacha($.key, $.iv, $.tag, text, $.ad));
    assertEquals(text, $.plaintext);
  }));
Deno.test("xchachapoly : wrong-size arguments", () =>
  fc_assert(fc_at_least_one_wrong(32, 24), fc_bin(), fc_bin())(
    ([key, iv], plaintext, data) =>
      assertEquals(xchachapoly(key, iv, plaintext, data), null),
  ));
Deno.test("polyxchacha : wrong-size arguments", () =>
  fc_assert(fc_at_least_one_wrong(32, 24, 16), fc_bin(), fc_bin())(
    ([key, iv, tag], ciphertext, data) =>
      assertEquals(polyxchacha(key, iv, tag, ciphertext, data), false),
  ));
