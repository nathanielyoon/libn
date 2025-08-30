import { assert, assertEquals } from "@std/assert";
import { de_b16 } from "@nyoon/base";
import { chacha, hchacha } from "./src/chacha.ts";
import { poly } from "./src/poly.ts";
import { polyxchacha, xchachapoly } from "./src/aead.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("chacha : rfc8439 sections 2.3.2, A.1", () =>
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
Deno.test("poly : rfc8439 section 2.5.2, donna selftests", () =>
  [vectors.rfc8439["2.5.2"], ...vectors.donna].forEach(({ key, raw, tag }) =>
    assertEquals(
      poly(new DataView(de_b16(key).buffer), de_b16(raw)),
      de_b16(tag),
    )
  ));
Deno.test("xchachapoly and polyxchacha : wycheproof xchacha20_poly1305", () =>
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
