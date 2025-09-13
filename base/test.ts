import { assertEquals } from "@std/assert";
import fc from "fast-check";
import { fc_bin, fc_check, fc_str } from "../test.ts";
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

Deno.test("encode/decode round-trip losslessly", () =>
  ([
    [en_b16, de_b16],
    [en_b32, de_b32],
    [en_h32, de_h32],
    [en_z32, de_z32],
    [en_c32, de_c32],
    [en_b64, de_b64],
    [en_u64, de_u64],
  ] as const).forEach(([encode, decode]) =>
    fc_check(fc.property(fc_bin(), ($) => assertEquals(decode(encode($)), $)))
  ));
Deno.test("encoding and decoding matches rfc4648 section 10", () =>
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
