import { blake2b, blake2s } from "@libn/hash/blake2";
import { blake3 } from "@libn/hash/blake3";
import { hkdf, hmac } from "@libn/hash/hmac";
import { sha224, sha256, sha384, sha512 } from "@libn/hash/sha2";
import { assertEquals, assertNotEquals } from "@std/assert";
import { crypto as std } from "@std/crypto";
import fc from "fast-check";
import { fcBin } from "../test.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("sha2.sha224 : vectors", () => {
  for (const $ of vectors.sha224) {
    assertEquals(
      sha224(Uint8Array.fromHex($.data)),
      Uint8Array.fromHex($.digest),
    );
  }
});
Deno.test("sha2.sha256 : vectors", () => {
  for (const $ of vectors.sha256) {
    assertEquals(
      sha256(Uint8Array.fromHex($.data)),
      Uint8Array.fromHex($.digest),
    );
  }
});
Deno.test("sha2.sha384 : vectors", () => {
  for (const $ of vectors.sha384) {
    assertEquals(
      sha384(Uint8Array.fromHex($.data)),
      Uint8Array.fromHex($.digest),
    );
  }
});
Deno.test("sha2.sha512 : vectors", () => {
  for (const $ of vectors.sha512) {
    assertEquals(
      sha512(Uint8Array.fromHex($.data)),
      Uint8Array.fromHex($.digest),
    );
  }
});
Deno.test("sha2.sha256 :: built-in digest", async () => {
  await fc.assert(fc.asyncProperty(fcBin(), async ($) => {
    assertEquals(sha256($).buffer, await crypto.subtle.digest("SHA-256", $));
  }));
});
Deno.test("sha2.sha384 :: built-in digest", async () => {
  await fc.assert(fc.asyncProperty(fcBin(), async ($) => {
    assertEquals(sha384($).buffer, await crypto.subtle.digest("SHA-384", $));
  }));
});
Deno.test("sha2.sha512 :: built-in digest", async () => {
  await fc.assert(fc.asyncProperty(fcBin(), async ($) => {
    assertEquals(sha512($).buffer, await crypto.subtle.digest("SHA-512", $));
  }));
});
Deno.test("sha2.sha224 :: @std/crypto digestSync", () => {
  fc.assert(fc.property(fcBin(), ($) => {
    assertEquals(sha224($).buffer, std.subtle.digestSync("SHA-224", $));
  }));
});
Deno.test("sha2.sha256 :: @std/crypto digestSync", () => {
  fc.assert(fc.property(fcBin(), ($) => {
    assertEquals(sha256($).buffer, std.subtle.digestSync("SHA-256", $));
  }));
});
Deno.test("sha2.sha384 :: @std/crypto digestSync", () => {
  fc.assert(fc.property(fcBin(), ($) => {
    assertEquals(sha384($).buffer, std.subtle.digestSync("SHA-384", $));
  }));
});
Deno.test("sha2.sha512 :: @std/crypto digestSync", () => {
  fc.assert(fc.property(fcBin(), ($) => {
    assertEquals(sha512($).buffer, std.subtle.digestSync("SHA-512", $));
  }));
});

Deno.test("hmac.hmac : vectors", () => {
  for (const $ of vectors.hmac) {
    const tag = hmac(Uint8Array.fromHex($.key), Uint8Array.fromHex($.data))
      .subarray(0, $.tag.length >> 1);
    if ($.result) assertEquals(tag, Uint8Array.fromHex($.tag));
    else assertNotEquals(tag, Uint8Array.fromHex($.tag));
  }
});
Deno.test("hmac.hkdf : vectors", () => {
  for (const $ of vectors.hkdf) {
    assertEquals(
      hkdf(
        Uint8Array.fromHex($.key),
        Uint8Array.fromHex($.info),
        Uint8Array.fromHex($.salt),
        $.out,
      ),
      Uint8Array.fromHex($.derived),
    );
  }
});
Deno.test("hmac.hmac :: built-in sign", async () => {
  await fc.assert(fc.asyncProperty(
    fcBin({ minLength: 1 }),
    fcBin(),
    async (key, data) => {
      assertEquals(
        hmac(key, data).buffer,
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
      );
    },
  ));
});
Deno.test("hmac.hkdf :: built-in deriveBits", async () => {
  await fc.assert(fc.asyncProperty(
    fcBin(),
    fcBin(),
    fcBin({ maxLength: 32 }),
    fc.integer({ min: 1, max: 255 }),
    async (key, info, salt, length) => {
      assertEquals(
        hkdf(key, info, salt, length).buffer,
        await crypto.subtle.deriveBits(
          { name: "HKDF", hash: "SHA-256", info: info, salt: salt },
          await crypto.subtle.importKey(
            "raw",
            key,
            "HKDF",
            false,
            ["deriveBits"],
          ),
          length << 3,
        ),
      );
    },
  ));
});

Deno.test("blake2.blake2s : vectors", () => {
  for (const $ of vectors.blake2s) {
    assertEquals(
      blake2s(
        Uint8Array.fromHex($.in),
        Uint8Array.fromHex($.key),
        $.hash.length >> 1,
      ),
      Uint8Array.fromHex($.hash),
    );
  }
});
Deno.test("blake2.blake2b : vectors", () => {
  for (const $ of vectors.blake2b) {
    assertEquals(
      blake2b(
        Uint8Array.fromHex($.in),
        Uint8Array.fromHex($.key),
        $.hash.length >> 1,
      ),
      Uint8Array.fromHex($.hash),
    );
  }
});
Deno.test("blake2.blake2s :: @std/crypto digestSync", () => {
  fc.assert(fc.property(fcBin(), ($) => {
    assertEquals(
      blake2s($),
      new Uint8Array(std.subtle.digestSync("BLAKE2S", $)),
    );
  }));
});
Deno.test("blake2.blake2b :: @std/crypto digestSync", () => {
  fc.assert(fc.property(fcBin(), ($) => {
    assertEquals(
      blake2b($),
      new Uint8Array(std.subtle.digestSync("BLAKE2B", $)),
    );
  }));
});

Deno.test("blake3.blake3 :: vectors", () => {
  const key = new TextEncoder().encode(vectors.blake3.key);
  const context = vectors.blake3.context;
  const length = vectors.blake3.length;
  for (const $ of vectors.blake3.cases) {
    const input = Uint8Array.from({ length: $.input }, (_, z) => z % 251);
    assertEquals(blake3(input, undefined, length), Uint8Array.fromHex($.hash));
    assertEquals(blake3(input, key, length), Uint8Array.fromHex($.keyed));
    assertEquals(blake3(input, context, length), Uint8Array.fromHex($.derive));
  }
});
Deno.test("blake3.blake3 :: @std/crypto digestSync", () => {
  fc.assert(fc.property(fcBin(), ($) => {
    assertEquals(blake3($), new Uint8Array(std.subtle.digestSync("BLAKE3", $)));
  }));
});
