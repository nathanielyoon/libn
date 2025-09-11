import { assertEquals } from "@std/assert";
import { crypto } from "@std/crypto";
import fc from "fast-check";
import { de_b16, en_b16 } from "@libn/base";
import { fc_bin, fc_check } from "../test.ts";
import { sha224, sha256, sha384, sha512 } from "./src/sha2.ts";
import { hmac } from "./src/hmac.ts";
import { hkdf } from "./src/hkdf.ts";
import { b2b, b2s } from "./src/blake2.ts";
import { b3, b3_derive, b3_keyed } from "./src/blake3.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("sha224 matches nist aft", () =>
  vectors.nist.sha224.forEach(($) =>
    assertEquals(sha224(de_b16($.data)), de_b16($.digest))
  ));
Deno.test("sha256 matches nist aft", () =>
  vectors.nist.sha256.forEach(($) =>
    assertEquals(sha256(de_b16($.data)), de_b16($.digest))
  ));
Deno.test("sha384 matches nist aft", () =>
  vectors.nist.sha384.forEach(($) =>
    assertEquals(sha384(de_b16($.data)), de_b16($.digest))
  ));
Deno.test("sha512 matches nist aft", () =>
  vectors.nist.sha512.forEach(($) =>
    assertEquals(sha512(de_b16($.data)), de_b16($.digest))
  ));
Deno.test("hmac matches wycheproof", () =>
  vectors.wycheproof.hmac.forEach(($) =>
    assertEquals(
      en_b16(
        hmac(de_b16($.key), de_b16($.data)).subarray(0, $.tag.length >> 1),
      ) === $.tag,
      $.result,
    )
  ));
Deno.test("hkdf matches wycheproof", () =>
  vectors.wycheproof.hkdf.forEach(($) =>
    assertEquals(
      hkdf(de_b16($.key), de_b16($.info), de_b16($.salt), $.out),
      de_b16($.derived),
    )
  ));
Deno.test("blake2s matches reference", () =>
  vectors.blake2.s.forEach(($) =>
    assertEquals(
      b2s(de_b16($.in), de_b16($.key), $.hash.length >> 1),
      de_b16($.hash),
    )
  ));
Deno.test("blake2b matches reference", () =>
  vectors.blake2.b.forEach(($) =>
    assertEquals(
      b2b(de_b16($.in), de_b16($.key), $.hash.length >> 1),
      de_b16($.hash),
    )
  ));
Deno.test("blake3 matches reference", () => {
  const keyed = b3_keyed.bind(null, de_b16(vectors.blake3.key));
  const derive = b3_derive(de_b16(vectors.blake3.context));
  const length = vectors.blake3.output_length;
  vectors.blake3.cases.forEach(($) => {
    const input = Uint8Array.from({ length: $.input }, (_, z) => z % 251);
    assertEquals(b3(input, length), de_b16($.hash));
    assertEquals(keyed(input, length), de_b16($.keyed));
    assertEquals(derive(input, length), de_b16($.derive));
  });
});
Deno.test("sha224 matches webcrypto", () =>
  fc_check(fc.asyncProperty(fc_bin(), async ($) =>
    assertEquals(
      sha224($),
      new Uint8Array(await crypto.subtle.digest("SHA-224", $)),
    ))));
Deno.test("sha256 matches webcrypto", () =>
  fc_check(fc.asyncProperty(fc_bin(), async ($) =>
    assertEquals(
      sha256($),
      new Uint8Array(await crypto.subtle.digest("SHA-256", $)),
    ))));
Deno.test("sha384 matches webcrypto", () =>
  fc_check(fc.asyncProperty(fc_bin(), async ($) =>
    assertEquals(
      sha384($),
      new Uint8Array(await crypto.subtle.digest("SHA-384", $)),
    ))));
Deno.test("sha512 matches webcrypto", () =>
  fc_check(fc.asyncProperty(fc_bin(), async ($) =>
    assertEquals(
      sha512($),
      new Uint8Array(await crypto.subtle.digest("SHA-512", $)),
    ))));
Deno.test("hmac matches webcrypto", () =>
  fc_check(
    fc.asyncProperty(fc_bin({ minLength: 1 }), fc_bin(), async (key, data) =>
      assertEquals(
        hmac(key, data),
        new Uint8Array(
          await crypto.subtle.sign(
            "HMAC",
            await crypto.subtle.importKey(
              "raw",
              key,
              { name: "HMAC", hash: "SHA-256" },
              false,
              ["sign"],
            ),
            data,
          ),
        ),
      )),
  ));
Deno.test("hkdf matches webcrypto", () =>
  fc_check(fc.asyncProperty(
    fc_bin(),
    fc_bin(),
    fc_bin({ maxLength: 32 }),
    fc.integer({ min: 1, max: 8160 }),
    async (key, info, salt, out) =>
      assertEquals(
        hkdf(key, info, salt, out),
        new Uint8Array(
          await crypto.subtle.deriveBits(
            { name: "HKDF", hash: "SHA-256", info, salt },
            await crypto.subtle.importKey("raw", key, "HKDF", false, [
              "deriveBits",
            ]),
            out << 3,
          ),
        ),
      ),
  )));
Deno.test("blake2s matches webcrypto", () =>
  fc_check(fc.asyncProperty(fc_bin(), async ($) =>
    assertEquals(
      b2s($),
      new Uint8Array(await crypto.subtle.digest("BLAKE2S", $)),
    ))));
Deno.test("blake2b matches webcrypto", () =>
  fc_check(fc.asyncProperty(fc_bin(), async ($) =>
    assertEquals(
      b2b($),
      new Uint8Array(await crypto.subtle.digest("BLAKE2B", $)),
    ))));
Deno.test("blake3 matches webcrypto", () =>
  fc_check(fc.asyncProperty(fc_bin(), async ($) =>
    assertEquals(
      b3($),
      new Uint8Array(await crypto.subtle.digest("BLAKE3", $)),
    ))));
