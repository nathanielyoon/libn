import { assertEquals } from "@std/assert";
import fc from "fast-check";
import { fc_bin, fc_check, fc_str, get_rfc, vectors } from "@nyoon/test";
import { de_b16, en_b16 } from "./16.ts";
import { de_b32, de_h32, en_b32, en_h32 } from "./32.ts";
import { de_b64, de_u64, en_b64, en_u64 } from "./64.ts";
import { de_bin, en_bin } from "./mod.ts";

Deno.test("encoding/decoding round-trips losslessly", () =>
  ([
    [en_b16, de_b16],
    [en_b32, de_b32],
    [en_h32, de_h32],
    [en_b64, de_b64],
    [en_u64, de_u64],
  ] as const).forEach(([encode, decode]) =>
    fc_check(fc.property(fc_bin(), ($) => assertEquals(decode(encode($)), $)))
  ));
await vectors(import.meta, async () => ({
  rfc4648: await get_rfc(4648, 25691, 26723).then((text) =>
    ["16", "32", "32-hex", "64", "64url"].reduce((to, base) => ({
      ...to,
      [`base${base.replace("-", "")}`]: text.matchAll(
        RegExp(`^ {3}BASE${base.toUpperCase()}\\("(.*)"\\) = "(.*)"$`, "gm"),
      ).map(([_, ascii, binary]) => ({
        ascii,
        binary: base === "16"
          ? binary.toLowerCase()
          : base === "64"
          ? binary
          : binary.replace(/=+$/, ""),
      })).toArray(),
    }), {})
  ),
}));
Deno.test("encoding/decoding matches RFC4648 test vectors", () =>
  import("./vectors.json", { with: { type: "json" } }).then(($) =>
    ([
      [en_b16, de_b16, $.default.rfc4648.base16],
      [en_b32, de_b32, $.default.rfc4648.base32],
      [en_h32, de_h32, $.default.rfc4648.base32hex],
      [en_b64, de_b64, $.default.rfc4648.base64],
      [en_u64, de_u64, $.default.rfc4648.base64url],
    ] as const).forEach(([encode, decode, data]) =>
      data.forEach(({ ascii, binary }) => {
        assertEquals(encode(en_bin(ascii)), binary);
        assertEquals(de_bin(decode(binary)), ascii);
      })
    )
  ));
Deno.test("bound functions match separate instantiations", () => {
  fc_check(fc.property(
    fc_str(),
    ($) => assertEquals(en_bin($), new TextEncoder().encode($)),
  ));
  fc_check(fc.property(
    fc_bin(),
    ($) => assertEquals(de_bin($), new TextDecoder().decode($)),
  ));
});
