import { assertEquals } from "jsr:@std/assert@^1.0.14";
import { get_text, write } from "../../test.ts";
import { de_b16, en_b16 } from "../16.ts";
import { de_b32, de_h32, en_b32, en_h32 } from "../32.ts";
import { de_b64, de_u64, en_b64, en_u64 } from "../64.ts";
import { de_bin, en_bin } from "../main.ts";

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
  import("./vectors/rfc.json", { with: { type: "json" } }).then(($) =>
    test(($) => en_b16($).toUpperCase(), de_b16, $.default.base16)
  ));

Deno.test("base32", () =>
  import("./vectors/rfc.json", { with: { type: "json" } }).then(($) => {
    test(en_b32, de_b32, $.default.base32);
    test(en_h32, de_h32, $.default.base32hex);
  }));
Deno.test("base64", () =>
  import("./vectors/rfc.json", { with: { type: "json" } }).then(($) =>
    test(en_b64, de_b64, $.default.base64)
  ));
Deno.test("base64url", () =>
  import("./vectors/rfc.json", { with: { type: "json" } }).then(($) =>
    test(en_b64, de_b64, $.default.base64url)
  ));

import.meta.main && await get_text(4648, 25691, 26723)
  .then(($) =>
    ["16", "32", "32-hex", "64", "64url"].reduce((all, base) => ({
      ...all,
      [`base${base.replace("-", "")}`]: $.matchAll(
        RegExp(`^ {3}BASE${base.toUpperCase()}\\("(.*)"\\) = "(.*)"$`, "gm"),
      ).reduce<{ ascii: string; base: string }[]>((cases, $) => [
        ...cases,
        { ascii: $[1], base: base === "64" ? $[2] : $[2].replace(/=+$/, "") },
      ], []),
    }), {})
  ).then(write(import.meta));
