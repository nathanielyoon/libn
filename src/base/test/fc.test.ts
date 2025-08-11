import {
  de_b16,
  de_b64,
  de_bin,
  en_b16,
  en_b64,
  en_bin,
  en_key,
} from "../main.ts";
import { assertEquals } from "jsr:@std/assert@^1.0.13";
import fc from "npm:fast-check@^4.2.0";

const test = <A, B>(en: ($: A) => B, de: ($: B) => A, data: fc.Arbitrary<A>) =>
  fc.assert(fc.property(data, ($) => assertEquals(de(en($)), $)));
const fc_binary = fc.uint8Array({ size: "xlarge" });
Deno.test("base16", () => test(en_b16, de_b16, fc_binary));
Deno.test("base64", () => {
  test(en_b64, de_b64, fc_binary);
  test(en_key, de_b64, fc.uint8Array({ minLength: 32, maxLength: 32 }));
});
Deno.test("text", () => test(en_bin, de_bin, fc.string({ unit: "grapheme" })));
