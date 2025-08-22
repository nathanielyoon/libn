import { assertEquals } from "jsr:@std/assert@^1.0.14";
import fc from "npm:fast-check@^4.2.0";
import { fc_binary } from "../../test.ts";
import { de_b16, en_b16 } from "../16.ts";
import { de_b32, de_h32, en_b32, en_h32 } from "../32.ts";
import { de_b64, de_u64, en_b64, en_u64 } from "../64.ts";
import { de_bin, en_bin } from "../main.ts";

const test = <A, B>(en: ($: A) => B, de: ($: B) => A, data: fc.Arbitrary<A>) =>
  fc.assert(fc.property(data, ($) => assertEquals(de(en($)), $)));
Deno.test("base16", () => test(en_b16, de_b16, fc_binary()));
Deno.test("base32", () => {
  test(en_b32, de_b32, fc_binary());
  test(en_h32, de_h32, fc_binary());
});
Deno.test("base64", () => {
  test(en_b64, de_b64, fc_binary());
  test(en_u64, de_u64, fc_binary());
});
Deno.test("text", () => test(en_bin, de_bin, fc.string({ unit: "grapheme" })));
