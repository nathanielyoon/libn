import { cipher, decrypt, encrypt } from "@libn/aead";
import { assert, assertEquals } from "@std/assert";
import fc from "fast-check";
import { polyXchacha, xchachaPoly } from "./aead.ts";
import { chacha, hchacha, xor } from "./chacha.ts";
import { poly } from "./poly.ts";
import vectors from "./vectors.json" with { type: "json" };

const u32 = ($: string) => new Uint32Array(Uint8Array.fromHex($).buffer);
const fcWrong = <const A extends number[]>(...lengths: A) =>
  fc.oneof(
    ...Array(lengths.length).keys().map((index) =>
      fc.tuple(...lengths.map(($, z) =>
        z !== index ? fc.uint8Array({ minLength: $, maxLength: $ }) : fc.oneof(
          fc.uint8Array({ minLength: $ + 1 }),
          fc.uint8Array({ maxLength: $ - 1 }),
        )
      ))
    ),
  ) as fc.Arbitrary<{ [_ in keyof A]: Uint8Array<ArrayBuffer> }>;

Deno.test("chacha.chacha : vectors", () => {
  for (const $ of vectors.chacha) {
    const state = new Uint32Array(16);
    const [iv0, iv1, iv2] = u32($.iv);
    chacha(u32($.key), $.count, iv0, iv1, iv2, state);
    assertEquals(
      new Uint8Array(state.buffer).subarray(0, $.state.length >> 1),
      Uint8Array.fromHex($.state),
    );
  }
});
Deno.test("chacha.hchacha : vectors", () => {
  for (const $ of vectors.hchacha) {
    assertEquals(
      hchacha(Uint8Array.fromHex($.key), Uint8Array.fromHex($.iv)),
      u32($.subkey),
    );
  }
});
Deno.test("chacha.xor : vectors", () => {
  for (const $ of vectors.xor) {
    const plaintext = Uint8Array.fromHex($.plaintext);
    const [iv0, iv1, iv2] = u32($.iv);
    xor(u32($.key), iv0, iv1, iv2, plaintext, $.count);
    assertEquals(plaintext, Uint8Array.fromHex($.ciphertext));
  }
});

Deno.test("poly.poly : vectors", () => {
  for (const $ of vectors.poly) {
    assertEquals(
      poly(u32($.key), Uint8Array.fromHex($.message)),
      Uint8Array.fromHex($.tag),
    );
  }
});
Deno.test("poly.poly : empty key/message", () => {
  assertEquals(poly(new Uint32Array(8), new Uint8Array()), new Uint8Array(16));
});

Deno.test("aead.xchachaPoly : vectors", () => {
  for (const $ of vectors.xchachaPoly) {
    const plaintext = Uint8Array.fromHex($.plaintext);
    assertEquals(
      xchachaPoly(
        Uint8Array.fromHex($.key),
        Uint8Array.fromHex($.iv),
        plaintext,
        Uint8Array.fromHex($.ad),
      ),
      Uint8Array.fromHex($.tag),
    );
    assertEquals(plaintext, Uint8Array.fromHex($.ciphertext));
  }
});
Deno.test("vectors.polyXchacha : vectors", () => {
  for (const $ of vectors.polyXchacha) {
    const key = Uint8Array.fromHex($.key);
    const iv = Uint8Array.fromHex($.iv);
    const ciphertext = Uint8Array.fromHex($.ciphertext);
    const ad = Uint8Array.fromHex($.ad);
    const tag = Uint8Array.fromHex($.tag);
    if ($.result) {
      assertEquals(polyXchacha(key, iv, tag, ciphertext, ad), true);
      assertEquals(ciphertext, Uint8Array.fromHex($.plaintext));
    } else assertEquals(polyXchacha(key, iv, tag, ciphertext, ad), false);
  }
});
Deno.test("aead.xchachaPoly : wrong-size arguments", () => {
  fc.assert(fc.property(fcWrong(32, 24), ($) => {
    assertEquals(xchachaPoly(...$, new Uint8Array(), new Uint8Array()), null);
  }));
});
Deno.test("aead.polyXchacha : wrong-size arguments", () => {
  fc.assert(fc.property(fcWrong(32, 24, 16), ($) => {
    assertEquals(polyXchacha(...$, new Uint8Array(), new Uint8Array()), null);
  }));
});

Deno.test("mod : binary", () => {
  fc.assert(fc.property(
    fc.uint8Array({ minLength: 32, maxLength: 32 }),
    fc.uint8Array(),
    fc.uint8Array(),
    (key, plaintext, data) => {
      const textWithAd = encrypt(key, plaintext, data);
      assert(textWithAd);
      assertEquals(decrypt(key, textWithAd, data), plaintext);
      const textWithoutAd = encrypt(key, plaintext);
      assert(textWithoutAd);
      assertEquals(decrypt(key, textWithoutAd), plaintext);
    },
  ));
});
Deno.test("mod.cipher : vectors", () => {
  for (const $ of vectors.cipher) {
    const key = Uint8Array.fromHex($.key);
    const iv = Uint8Array.fromHex($.iv);
    const plaintext = Uint8Array.fromHex($.plaintext);
    const text = new Uint8Array(plaintext.length);
    cipher(key, iv, text);
    assertEquals(text, Uint8Array.fromHex($.keystream));
    text.set(plaintext), cipher(key, iv, text);
    assertEquals(text, Uint8Array.fromHex($.ciphertext));
  }
});
Deno.test("mod.encrypt : wrong-size arguments", () => {
  fc.assert(fc.property(fcWrong(32), ($) => {
    assertEquals(encrypt(...$, new Uint8Array()), null);
    assertEquals(encrypt(...$, new Uint8Array(), new Uint8Array()), null);
  }));
});
Deno.test("mod.decrypt : wrong-size arguments", () => {
  fc.assert(fc.property(
    fc.oneof(
      fc.tuple(fcWrong(32).map(($) => $[0]), fc.uint8Array({ minLength: 40 })),
      fc.tuple(
        fc.uint8Array({ minLength: 32, maxLength: 32 }),
        fc.uint8Array({ maxLength: 39 }),
      ),
    ),
    ($) => {
      assertEquals(decrypt(...$), null);
      assertEquals(decrypt(...$, new Uint8Array()), null);
    },
  ));
});
