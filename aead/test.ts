import { assert, assertEquals } from "@std/assert";
import fc from "fast-check";
import { de_b16 } from "@libn/base";
import { fc_bin, fc_check, fc_key } from "../test.ts";
import { chacha } from "./src/chacha.ts";
import { poly } from "./src/poly.ts";
import { polyxchacha, xchachapoly } from "./src/aead.ts";
import { decrypt, encrypt, xor } from "./mod.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("chacha matches rfc8439 sections 2.3.2, A.1", () =>
  [vectors.rfc8439["2.3.2"], ...vectors.rfc8439["A.1"]].forEach(
    ({ key, iv, count, state }) => {
      const view = new DataView(de_b16(iv).buffer), to = new Uint32Array(16);
      chacha(
        new DataView(de_b16(key).buffer),
        count,
        view.getUint32(0, true),
        view.getUint32(4, true),
        view.getUint32(8, true),
        to,
      ), assertEquals(new Uint8Array(to.buffer), de_b16(state));
    },
  ));
Deno.test("poly matches rfc8439 section 2.5.2, donna selftests", () =>
  [vectors.rfc8439["2.5.2"], ...vectors.donna].forEach(({ key, raw, tag }) =>
    assertEquals(
      poly(new DataView(de_b16(key).buffer), de_b16(raw)),
      de_b16(tag),
    )
  ));
Deno.test("xchacha matches draft-irtf-cfrg-xchacha-03 section A.3.2.1", () => {
  const key = de_b16(vectors.xchacha.key), iv = de_b16(vectors.xchacha.iv);
  const text = de_b16(vectors.xchacha.plaintext);
  const keystream = new Uint8Array(text.length);
  xor(key, iv, keystream);
  assertEquals(keystream, de_b16(vectors.xchacha.keystream));
  xor(key, iv, text);
  assertEquals(text, de_b16(vectors.xchacha.ciphertext));
});
Deno.test("xchachapoly/polyxchacha match wycheproof", () =>
  vectors.wycheproof.forEach(($) => {
    const key = de_b16($.key), iv = de_b16($.iv);
    const plaintext = de_b16($.plaintext), ciphertext = de_b16($.ciphertext);
    const associated_data = de_b16($.associated_data);
    const tag = de_b16($.tag);
    if ($.result) {
      const temp = new Uint8Array(plaintext);
      assertEquals(xchachapoly(key, iv, temp, associated_data), tag);
      assertEquals(temp, ciphertext);
      assert(polyxchacha(key, iv, tag, temp, associated_data));
      assertEquals(temp, plaintext);
    } else assert(!polyxchacha(key, iv, tag, ciphertext, associated_data));
  }));
Deno.test("encryption/decryption round-trips losslessly", () =>
  fc_check(fc.property(fc_key, fc_bin(), fc_bin(), (key, $, data) => {
    assertEquals(decrypt(key, encrypt(key, $, data)!, data)!, $);
    assertEquals(decrypt(key, encrypt(key, $)!)!, $);
  })));
const fc_wrong = ($: number) =>
  fc.oneof(fc_bin({ maxLength: $ - 1 }), fc_bin({ minLength: $ + 1 }));
const fc_at_least_one_wrong = <const A extends number[]>(...lengths: A) =>
  fc.oneof(...Array.from(lengths, (_, index) =>
    fc.tuple(
      ...lengths.map(($, z) =>
        z !== index
          ? fc.oneof(fc_bin({ minLength: $, maxLength: $ }), fc_wrong($))
          : fc_wrong($)
      ),
    )));
Deno.test("xor rejects wrong-size arguments", () =>
  fc_check(fc.property(
    fc_at_least_one_wrong(32, 24),
    fc_bin(),
    ([key, iv], text) => {
      const copy = new Uint8Array(text);
      xor(key, iv, text), assertEquals(text, copy);
    },
  )));
Deno.test("xchachapoly rejects wrong-size arguments", () =>
  fc_check(fc.property(
    fc_at_least_one_wrong(32, 24),
    fc_bin(),
    fc_bin(),
    ([key, iv], plaintext, data) =>
      assertEquals(xchachapoly(key, iv, plaintext, data), undefined),
  )));
Deno.test("polyxchacha rejects wrong-size arguments", () =>
  fc_check(fc.property(
    fc_at_least_one_wrong(32, 24, 16),
    fc_bin(),
    fc_bin(),
    ([key, iv, tag], ciphertext, data) =>
      assertEquals(polyxchacha(key, iv, tag, ciphertext, data), false),
  )));
Deno.test("encrypt/decrypt reject wrong-size arguments", () =>
  fc_check(fc.property(
    fc_wrong(32),
    fc_bin(),
    fc_bin(),
    (key, $, data) => {
      assertEquals(encrypt(key, $, data), undefined);
      assertEquals(decrypt(key, $, data), undefined);
    },
  )));
