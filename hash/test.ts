import { assertEquals, assertNotEquals } from "@std/assert";
import { crypto } from "@std/crypto";
import fc from "fast-check";
import { de_b16, en_b16 } from "@libn/base";
import { fc_binary, fc_check, read } from "@libn/lib";
import { sha224, sha256, sha384, sha512 } from "./src/sha2.ts";
import { hkdf_sha256, hmac_sha256 } from "./src/hmac.ts";
import {
  b2b,
  b2b_create,
  b2b_digest,
  b2b_update,
  b2s,
  b2s_create,
  b2s_digest,
  b2s_update,
} from "./src/blake2.ts";
import { b3, b3_derive, b3_keyed } from "./src/blake3.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("sha2", async ({ step }) => {
  await step("sha224 : nist aft", () => {
    for (const $ of read(vectors.sha2.nist_224)) {
      assertEquals(sha224($.data), $.digest);
    }
  });
  await step("sha256 : nist aft", () => {
    for (const $ of read(vectors.sha2.nist_256)) {
      assertEquals(sha256($.data), $.digest);
    }
  });
  await step("sha384 : nist aft", () => {
    for (const $ of read(vectors.sha2.nist_384)) {
      assertEquals(sha384($.data), $.digest);
    }
  });
  await step("sha512 : nist aft", () => {
    for (const $ of read(vectors.sha2.nist_512)) {
      assertEquals(sha512($.data), $.digest);
    }
  });
  await step("sha224 :: webcrypto", async () => {
    await fc_check(fc.asyncProperty(
      fc_binary(),
      async ($) =>
        assertEquals(
          sha224($),
          new Uint8Array(await crypto.subtle.digest("SHA-224", $)),
        ),
    ));
  });
  await step("sha256 :: webcrypto", async () => {
    await fc_check(fc.asyncProperty(
      fc_binary(),
      async ($) =>
        assertEquals(
          sha256($),
          new Uint8Array(await crypto.subtle.digest("SHA-256", $)),
        ),
    ));
  });
  await step("sha384 :: webcrypto", async () => {
    await fc_check(fc.asyncProperty(
      fc_binary(),
      async ($) =>
        assertEquals(
          sha384($),
          new Uint8Array(await crypto.subtle.digest("SHA-384", $)),
        ),
    ));
  });
  await step("sha512 :: webcrypto", async () => {
    await fc_check(fc.asyncProperty(
      fc_binary(),
      async ($) =>
        assertEquals(
          sha512($),
          new Uint8Array(await crypto.subtle.digest("SHA-512", $)),
        ),
    ));
  });
});
Deno.test("hmac", async ({ step }) => {
  await step("hmac_sha256 : wycheproof", () => {
    for (const $ of read(vectors.hmac.wycheproof_hmac_sha256)) {
      const tag = hmac_sha256($.key, $.data).subarray(0, $.tag.length);
      if ($.result) assertEquals(tag, $.tag);
      else assertNotEquals(tag, $.tag);
    }
  });
  await step("hkdf_sha256 : wycheproof", () => {
    for (const $ of read(vectors.hmac.wycheproof_hkdf_sha256)) {
      assertEquals(hkdf_sha256($.key, $.info, $.salt, $.out), $.derived);
    }
  });
  await step("hmac_sha256 :: webcrypto", async () => {
    await fc_check(fc.asyncProperty(
      fc_binary({ minLength: 1 }),
      fc_binary(),
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
    ));
  });
  await step("hkdf_sha256 :: webcrypto", async () => {
    await fc_check(fc.asyncProperty(
      fc_binary(),
      fc_binary(),
      fc_binary({ maxLength: 32 }),
      fc.integer({ min: 1, max: 8160 }),
      async (key, info, salt, out) =>
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
        ),
    ));
  });
});
Deno.test("blake2", async ({ step }) => {
  await step("b2s : reference", () => {
    for (const $ of read(vectors.blake2.reference_s)) {
      assertEquals(b2s($.in, $.key, $.hash.length), $.hash);
    }
  });
  await step("b2b : reference", () => {
    for (const $ of read(vectors.blake2.reference_b)) {
      assertEquals(b2b($.in, $.key, $.hash.length), $.hash);
    }
  });
  await step("b2s :: webcrypto", async () => {
    await fc_check(fc.asyncProperty(
      fc_binary(),
      async ($) =>
        assertEquals(
          b2s($),
          new Uint8Array(await crypto.subtle.digest("BLAKE2S", $)),
        ),
    ));
  });
  await step("b2b :: webcrypto", async () => {
    await fc_check(fc.asyncProperty(
      fc_binary(),
      async ($) =>
        assertEquals(
          b2b($),
          new Uint8Array(await crypto.subtle.digest("BLAKE2B", $)),
        ),
    ));
  });
  await step("blake2s/blake2b track long inputs", () => {
    for (
      const [offset, create, update, digest] of [
        [25, b2s_create, b2s_update, b2s_digest],
        [49, b2b_create, b2b_update, b2b_digest],
      ] as const
    ) {
      const one = create().fill(-1, offset, -2), two = one.with(-2, 1);
      assertNotEquals(
        digest(update(one, new Uint8Array(1))),
        digest(update(two, new Uint8Array(1))),
      );
    }
  });
  await step("blake2s/blake2b clamp key/output lengths", () => {
    for (const [size, hash] of [[32, b2s], [64, b2b]] as const) {
      fc_check(fc.property(
        fc_binary(),
        fc_binary({ minLength: size }),
        fc.nat({ max: size }),
        (input, key, length) => {
          assertEquals(hash(input, key), hash(input, key.subarray(0, size)));
          const keyed = hash.bind(null, input, key);
          assertEquals(keyed(), keyed(size));
          assertEquals(keyed(length + size), keyed(size));
          assertEquals(keyed(-length), keyed(-length >>> 0 || 1));
        },
      ));
    }
  });
});
Deno.test("blake3", async ({ step }) => {
  await step("b3/b3_keyed/b3_derive : reference", () => {
    const keyed = b3_keyed.bind(null, de_b16(vectors.blake3.reference.key));
    const derive = b3_derive(de_b16(vectors.blake3.reference.context));
    const length = vectors.blake3.reference.output_length;
    for (const $ of read(vectors.blake3.reference.cases)) {
      const input = Uint8Array.from({ length: $.input }, (_, z) => z % 251);
      assertEquals(b3(input, length), $.hash);
      assertEquals(keyed(input, length), $.keyed);
      assertEquals(derive(input, length), $.derive);
    }
  });
  await step("b3 :: webcrypto", async () => {
    await fc_check(fc.asyncProperty(
      fc_binary(),
      async ($) =>
        assertEquals(
          b3($),
          new Uint8Array(await crypto.subtle.digest("BLAKE3", $)),
        ),
    ));
  });
  await step("b3 : clamp key to 256 bits", () => {
    fc_check(fc.property(
      fc_binary({ minLength: 32 }),
      fc_binary(),
      (key, input) =>
        assertEquals(
          b3_keyed(key, input),
          b3_keyed(key.subarray(0, 32), input),
        ),
    ));
  });
});
