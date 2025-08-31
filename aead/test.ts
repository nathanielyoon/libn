import { assert, assertEquals } from "@std/assert";
import fc from "fast-check";
import { de_b16 } from "@nyoon/base";
import { fc_bin, fc_check, fc_key } from "@nyoon/test";
import { chacha } from "./src/chacha.ts";
import { poly } from "./src/poly.ts";
import { polyxchacha, xchachapoly } from "./src/aead.ts";
import { decrypt, encrypt } from "./mod.ts";
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
Deno.test("xchachapoly/polyxchacha match wycheproof", () =>
  vectors.wycheproof.forEach(($) => {
    const key = de_b16($.key), iv = de_b16($.iv), raw = de_b16($.raw);
    const data = de_b16($.data), text = xchachapoly(key, iv, raw, data);
    if (text) {
      if ($.result) {
        assertEquals(text, de_b16($.text));
        assertEquals(polyxchacha(key, iv, text, data), raw);
      } else assert(!polyxchacha(key, iv, de_b16($.text), data));
    } else assert(!$.result);
  }));
Deno.test("encryption/decryption round-trips losslessly", () =>
  fc_check(fc.property(fc_key, fc_bin(), fc_bin(), (key, $, data) => {
    assertEquals(decrypt(key, encrypt(key, $, data)!, data), $);
    assertEquals(decrypt(key, encrypt(key, $)!), $);
  })));
const fc_iv = fc_bin({ minLength: 24, maxLength: 24 });
const fc_not_key = fc.oneof(
  fc_bin({ maxLength: 31 }),
  fc_bin({ minLength: 33 }),
);
const fc_not_iv = fc.oneof(
  fc_bin({ maxLength: 23 }),
  fc_bin({ minLength: 25 }),
);
Deno.test("xchachapoly/polyxchacha reject wrong-size arguments", () =>
  fc_check(fc.property(
    fc.oneof(
      fc.tuple(fc.oneof(fc_key, fc_not_key), fc_not_iv),
      fc.tuple(fc_not_key, fc.oneof(fc_iv, fc_not_iv)),
    ),
    fc_bin(),
    fc_bin(),
    ([key, iv], $, data) => {
      assertEquals(xchachapoly(key, iv, $, data), null);
      assertEquals(polyxchacha(key, iv, $, data), null);
    },
  )));
Deno.test("encrypt/decrypt reject wrong-size arguments", () =>
  fc_check(fc.property(
    fc_not_key,
    fc_bin(),
    fc_bin(),
    (key, $, data) => {
      assertEquals(encrypt(key, $, data), null);
      assertEquals(decrypt(key, $, data), null);
    },
  )));
