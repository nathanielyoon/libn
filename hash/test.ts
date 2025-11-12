import { blake2b, blake2s } from "@libn/hash/blake2";
import { blake3 } from "@libn/hash/blake3";
import { hkdf, hmac } from "@libn/hash/hmac";
import { sha224, sha256, sha384, sha512 } from "@libn/hash/sha2";
import { assertEquals, assertNotEquals } from "@std/assert";
import { crypto as std } from "@std/crypto";
import fc from "fast-check";
import { get, set } from "../test.ts";
import vectors from "./vectors.json" with { type: "json" };

Deno.test("sha2.sha224() passes reference vectors", () =>
  vectors.sha224.forEach(($) => {
    assertEquals(
      sha224(Uint8Array.fromHex($.data)),
      Uint8Array.fromHex($.digest),
    );
  }));
Deno.test("sha2.sha256() passes reference vectors", () =>
  vectors.sha256.forEach(($) => {
    assertEquals(
      sha256(Uint8Array.fromHex($.data)),
      Uint8Array.fromHex($.digest),
    );
  }));
Deno.test("sha2.sha384() passes reference vectors", () =>
  vectors.sha384.forEach(($) => {
    assertEquals(
      sha384(Uint8Array.fromHex($.data)),
      Uint8Array.fromHex($.digest),
    );
  }));
Deno.test("sha2.sha512() passes reference vectors", () =>
  vectors.sha512.forEach(($) => {
    assertEquals(
      sha512(Uint8Array.fromHex($.data)),
      Uint8Array.fromHex($.digest),
    );
  }));
Deno.test("sha2.sha256() follows built-in digest", () =>
  fc.assert(fc.asyncProperty(fc.uint8Array(), async ($) => {
    assertEquals(
      sha256($),
      new Uint8Array(await crypto.subtle.digest("SHA-256", $)),
    );
  })));
Deno.test("sha2.sha384() follows built-in digest", () =>
  fc.assert(fc.asyncProperty(fc.uint8Array(), async ($) => {
    assertEquals(
      sha384($),
      new Uint8Array(await crypto.subtle.digest("SHA-384", $)),
    );
  })));
Deno.test("sha2.sha512() follows built-in digest", () =>
  fc.assert(fc.asyncProperty(fc.uint8Array(), async ($) => {
    assertEquals(
      sha512($),
      new Uint8Array(await crypto.subtle.digest("SHA-512", $)),
    );
  })));
Deno.test("sha2.sha224() follows @std/crypto digestSync", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    assertEquals(
      sha224($),
      new Uint8Array(std.subtle.digestSync("SHA-224", $)),
    );
  })));
Deno.test("sha2.sha256() follows @std/crypto digestSync", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    assertEquals(
      sha256($),
      new Uint8Array(std.subtle.digestSync("SHA-256", $)),
    );
  })));
Deno.test("sha2.sha384() follows @std/crypto digestSync", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    assertEquals(
      sha384($),
      new Uint8Array(std.subtle.digestSync("SHA-384", $)),
    );
  })));
Deno.test("sha2.sha512() follows @std/crypto digestSync", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    assertEquals(
      sha512($),
      new Uint8Array(std.subtle.digestSync("SHA-512", $)),
    );
  })));
Deno.test("hmac.hmac() passes reference vectors", () =>
  vectors.hmac.forEach(($) => {
    const tag = hmac(Uint8Array.fromHex($.key), Uint8Array.fromHex($.data))
      .subarray(0, $.tag.length >> 1);
    if ($.result) assertEquals(tag, Uint8Array.fromHex($.tag));
    else assertNotEquals(tag, Uint8Array.fromHex($.tag));
  }));
Deno.test("hmac.hkdf() passes reference vectors", () =>
  vectors.hkdf.forEach(($) => {
    assertEquals(
      hkdf(
        Uint8Array.fromHex($.key),
        Uint8Array.fromHex($.info),
        Uint8Array.fromHex($.salt),
        $.out,
      ),
      Uint8Array.fromHex($.derived),
    );
  }));
Deno.test("hmac.hmac() follows built-in sign", () =>
  fc.assert(fc.asyncProperty(
    fc.uint8Array({ minLength: 1 }),
    fc.uint8Array(),
    async (key, data) => {
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
      );
    },
  )));
Deno.test("hmac.hkdf() follows built-in deriveBits", () =>
  fc.assert(fc.asyncProperty(
    fc.uint8Array(),
    fc.uint8Array(),
    fc.uint8Array({ maxLength: 32 }),
    fc.integer({ min: 1, max: 255 }),
    async (key, info, salt, length) => {
      const actual = hkdf(key, info, salt, length);
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        key,
        "HKDF",
        false,
        ["deriveBits"],
      );
      const bits = await crypto.subtle.deriveBits(
        { name: "HKDF", hash: "SHA-256", info: info, salt: salt },
        cryptoKey,
        length << 3,
      );
      assertEquals(actual, new Uint8Array(bits));
    },
  )));
Deno.test("blake2.blake2s() passes reference vectors", () =>
  vectors.blake2s.forEach(($) => {
    assertEquals(
      blake2s(
        Uint8Array.fromHex($.in),
        Uint8Array.fromHex($.key),
        $.hash.length >> 1,
      ),
      Uint8Array.fromHex($.hash),
    );
  }));
Deno.test("blake2.blake2b() passes reference vectors", () =>
  vectors.blake2b.forEach(($) => {
    assertEquals(
      blake2b(
        Uint8Array.fromHex($.in),
        Uint8Array.fromHex($.key),
        $.hash.length >> 1,
      ),
      Uint8Array.fromHex($.hash),
    );
  }));
Deno.test("blake2.blake2s() follows @std/crypto digestSync", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    assertEquals(
      blake2s($),
      new Uint8Array(std.subtle.digestSync("BLAKE2S", $)),
    );
  })));
Deno.test("blake2.blake2b() follows @std/crypto digestSync", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    assertEquals(
      blake2b($),
      new Uint8Array(std.subtle.digestSync("BLAKE2B", $)),
    );
  })));
Deno.test("blake3.blake3() passes reference vectors", () => {
  const key = new TextEncoder().encode(vectors.blake3.key);
  const context = vectors.blake3.context;
  const length = vectors.blake3.length;
  vectors.blake3.cases.forEach(($) => {
    const input = Uint8Array.from({ length: $.input }, (_, z) => z % 251);
    assertEquals(blake3(input, undefined, length), Uint8Array.fromHex($.hash));
    assertEquals(blake3(input, key, length), Uint8Array.fromHex($.keyed));
    assertEquals(blake3(input, context, length), Uint8Array.fromHex($.derive));
  });
});
Deno.test("blake3.blake3() follows @std/crypto digestSync", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    assertEquals(blake3($), new Uint8Array(std.subtle.digestSync("BLAKE3", $)));
  })));

import.meta.main && Promise.all([
  Promise.all([224, 256, 384, 512].map((size) =>
    get([
      `/usnistgov/ACVP-Server/fb44dce5257aba23088256e63c9b950db6967610/gen-val/json-files/SHA2-${size}-1.0/internalProjection.json`,
    ]).then(JSON.parse).then((groups: {
      testGroups: { tests: { msg: string; len: number; md: string }[] }[];
    }) =>
      groups.testGroups[0].tests.filter(($) => $.len % 8 === 0).map(($) => ({
        data: $.msg,
        digest: $.md,
      }))
    )
  )),
  get`/C2SP/wycheproof/427a648c39e2edea11b75bcdcd72eea3da482d6f/testvectors_v1/hmac_sha256_test.json`,
  get`/C2SP/wycheproof/427a648c39e2edea11b75bcdcd72eea3da482d6f/testvectors_v1/hkdf_sha256_test.json`,
  Promise.all(["s", "b"].map((flavor) =>
    get([
      `/BLAKE2/BLAKE2/eec32b7170d8dbe4eb59c9afad2ee9297393fb5b/testvectors/blake2${flavor}-kat.txt`,
    ]).then(($) =>
      $.trim().split("\n\n").map((chunk) =>
        Object.fromEntries(chunk.split("\n").map((line) => line.split(":\t")))
      )
    )
  )),
  get`/BLAKE3-team/BLAKE3/ae3e8e6b3a5ae3190ca5d62820789b17886a0038/test_vectors/test_vectors.json`
    .then<{
      key: string;
      context_string: string;
      cases: {
        input_len: number;
        hash: string;
        keyed_hash: string;
        derive_key: string;
      }[];
    }>(JSON.parse),
]).then(async ([nist, hmac, hkdf, blake2, blake3]) => ({
  sha224: nist[0],
  sha256: nist[1],
  sha384: nist[2],
  sha512: nist[3],
  hmac: JSON.parse(hmac).testGroups.flatMap((group: {
    tests: {
      key: string;
      msg: string;
      tag: string;
      result: "valid" | "invalid";
    }[];
  }) =>
    group.tests.map(($) => ({
      key: $.key,
      data: $.msg,
      tag: $.tag,
      result: $.result === "valid",
    }))
  ),
  hkdf: JSON.parse(hkdf).testGroups.flatMap((group: {
    tests: {
      ikm: string;
      salt: string;
      info: string;
      size: number;
      okm: string;
      result: "valid" | "invalid";
    }[];
  }) =>
    group.tests.map(($) => ({
      key: $.ikm,
      info: $.info,
      salt: $.salt,
      out: $.size,
      derived: $.result === "valid" ? $.okm : "",
    }))
  ),
  blake2s: blake2[0],
  blake2b: blake2[1],
  blake3: {
    key: blake3.key,
    context: blake3.context_string,
    length: blake3.cases[0].hash.length >> 1,
    cases: blake3.cases.map(($) => ({
      input: $.input_len,
      hash: $.hash,
      keyed: $.keyed_hash,
      derive: $.derive_key,
    })),
  },
})).then(set(import.meta));
