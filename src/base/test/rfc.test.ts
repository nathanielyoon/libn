import { de_b16, en_b16 } from "../16.ts";
import { de_b32, de_h32, en_b32, en_h32 } from "../32.ts";
import { de_b64, en_b64 } from "../64.ts";
import { de_bin, en_bin } from "../main.ts";
import vectors from "./vectors.json" with { type: "json" };
import { assertEquals } from "jsr:@std/assert@^1.0.13";

const test = (
  en: ($: Uint8Array) => string,
  de: ($: string) => Uint8Array,
  data: { ascii: string; base: string }[],
) =>
  data.forEach(($) => {
    assertEquals(en(en_bin($.ascii)), $.base);
    assertEquals(de_bin(de($.base)), $.ascii);
  });
Deno.test("base16", () =>
  test(($) => en_b16($).toUpperCase(), de_b16, vectors.base16));
Deno.test("base32", () => {
  test(en_b32, de_b32, vectors.base32);
  test(en_h32, de_h32, vectors.base32hex);
});
Deno.test("base64", () => test(en_b64, de_b64, vectors.base64));

import.meta.main && await fetch("https://www.rfc-editor.org/rfc/rfc4648.txt")
  .then(async ($) => (await $.text()).slice(25691)).then(($) =>
    ["16", "32", "32-hex", "64"].reduce((all, base) => ({
      ...all,
      [`base${base.replace("-", "")}`]: $.matchAll(
        RegExp(`^ {3}BASE${base.toUpperCase()}\\("(.*)"\\) = "(.*)"$`, "gm"),
      ).reduce<{ ascii: string; base: string }[]>((cases, $) => [
        ...cases,
        { ascii: $[1], base: $[2].replace(/=+$/, "") },
      ], []),
    }), {})
  ).then(($) =>
    Deno.writeTextFile(`${import.meta.dirname}/vectors.json`, JSON.stringify($))
  );
