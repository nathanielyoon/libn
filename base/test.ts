import { assertEquals } from "@std/assert";
import fc from "fast-check";
import { fc_binary, fc_check, fc_string } from "@libn/lib";
import { de_b16, en_b16 } from "./src/16.ts";
import {
  de_b32,
  de_c32,
  de_h32,
  de_z32,
  en_b32,
  en_c32,
  en_h32,
  en_z32,
} from "./src/32.ts";
import { de_b64, de_u64, en_b64, en_u64 } from "./src/64.ts";
import { de_bin, en_bin } from "./mod.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("en_$base/de_$base : arbitrary round-trip", () =>
  ([
    [en_b16, de_b16],
    [en_b32, de_b32],
    [en_h32, de_h32],
    [en_z32, de_z32],
    [en_c32, de_c32],
    [en_b64, de_b64],
    [en_u64, de_u64],
  ] as const).forEach(([encode, decode]) =>
    fc_check(
      fc.property(fc_binary(), ($) => assertEquals(decode(encode($)), $)),
    )
  ));
Deno.test("en_$base/de_$base : rfc4648 10", () =>
  ([
    [en_b16, de_b16, vectors.rfc4648.base16],
    [en_b32, de_b32, vectors.rfc4648.base32],
    [en_h32, de_h32, vectors.rfc4648.base32hex],
    [en_b64, de_b64, vectors.rfc4648.base64],
    [en_u64, de_u64, vectors.rfc4648.base64url],
  ] as const).forEach(([encode, decode, data]) =>
    data.forEach(({ ascii, binary }) => {
      assertEquals(encode(en_bin(ascii)), binary);
      assertEquals(de_bin(decode(binary)), ascii);
    })
  ));
Deno.test("en_bin/de_bin :: separate instantiations and calls", () => {
  fc_check(fc.property(
    fc_string(),
    ($) => assertEquals(en_bin($), new TextEncoder().encode($)),
  ));
  fc_check(fc.property(
    fc_binary(),
    ($) => assertEquals(de_bin($), new TextDecoder().decode($)),
  ));
});
