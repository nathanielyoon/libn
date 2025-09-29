import { assertEquals, assertNotEquals } from "@std/assert";
import { crypto } from "@std/crypto";
import fc from "fast-check";
import { fc_assert, fc_bin, read } from "@libn/lib";
import { hkdf_sha256, hmac_sha256 } from "../src/hmac.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("hmac_sha256 : wycheproof", () =>
  read(vectors.hmac.wycheproof_hmac_sha256).forEach(($) => {
    const tag = hmac_sha256($.key, $.data).subarray(0, $.tag.length);
    if ($.result) assertEquals(tag, $.tag);
    else assertNotEquals(tag, $.tag);
  }));
Deno.test("hkdf_sha256 : wycheproof", () =>
  read(vectors.hmac.wycheproof_hkdf_sha256).forEach(($) =>
    assertEquals(hkdf_sha256($.key, $.info, $.salt, $.out), $.derived)
  ));
Deno.test("hmac_sha256 :: webcrypto", () =>
  fc_assert(fc_bin({ minLength: 1 }), fc_bin())(
    async (key, data) =>
      assertEquals(
        hmac_sha256(key, data),
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
      ),
    { async: true },
  ));
Deno.test("hkdf_sha256 :: webcrypto", () =>
  fc_assert(
    fc_bin(),
    fc_bin(),
    fc_bin({ maxLength: 32 }),
    fc.integer({ min: 1, max: 8160 }),
  )(async (key, info, salt, out) =>
    assertEquals(
      hkdf_sha256(key, info, salt, out),
      new Uint8Array(
        await crypto.subtle.deriveBits(
          { name: "HKDF", hash: "SHA-256", info, salt },
          await crypto.subtle.importKey("raw", key, "HKDF", false, [
            "deriveBits",
          ]),
          out << 3,
        ),
      ),
    ), { async: true }));
