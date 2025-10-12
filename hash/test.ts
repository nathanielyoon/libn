import { expect } from "@std/expect/expect";
import fc from "fast-check";
import { crypto as std } from "@std/crypto";
import { sha224, sha256, sha384, sha512 } from "@libn/hash/sha2";
import { hkdf, hmac } from "@libn/hash/hmac";
import { blake2b, blake2s } from "@libn/hash/blake2";
import { blake3 } from "@libn/hash/blake3";

Deno.test("spec", async (t) => {
  const vectors = await import("./vectors.json", { with: { type: "json" } });
  await t.step("sha224", () =>
    vectors.default.sha224.forEach(($) => {
      expect(sha224(Uint8Array.fromHex($.data))).toStrictEqual(
        Uint8Array.fromHex($.digest),
      );
    }));
  await t.step("sha256", () =>
    vectors.default.sha256.forEach(($) => {
      expect(sha256(Uint8Array.fromHex($.data))).toStrictEqual(
        Uint8Array.fromHex($.digest),
      );
    }));
  await t.step("sha384", () =>
    vectors.default.sha384.forEach(($) => {
      expect(sha384(Uint8Array.fromHex($.data))).toStrictEqual(
        Uint8Array.fromHex($.digest),
      );
    }));
  await t.step("sha512", () =>
    vectors.default.sha512.forEach(($) => {
      expect(sha512(Uint8Array.fromHex($.data))).toStrictEqual(
        Uint8Array.fromHex($.digest),
      );
    }));
  await t.step("hmac", () =>
    vectors.default.hmac.forEach(($) => {
      const tag = hmac(
        Uint8Array.fromHex($.key),
        Uint8Array.fromHex($.data),
      ).subarray(0, $.tag.length >> 1);
      if ($.result) expect(tag).toStrictEqual(Uint8Array.fromHex($.tag));
      else expect(tag).not.toStrictEqual(Uint8Array.fromHex($.tag));
    }));
  await t.step("hkdf", () =>
    vectors.default.hkdf.forEach(($) => {
      expect(hkdf(
        Uint8Array.fromHex($.key),
        Uint8Array.fromHex($.info),
        Uint8Array.fromHex($.salt),
        $.out,
      )).toStrictEqual(Uint8Array.fromHex($.derived));
    }));
  await t.step("blake2s", () =>
    vectors.default.blake2s.forEach(($) => {
      expect(blake2s(
        Uint8Array.fromHex($.in),
        Uint8Array.fromHex($.key),
        $.hash.length >> 1,
      )).toStrictEqual(Uint8Array.fromHex($.hash));
    }));
  await t.step("blake2b", () =>
    vectors.default.blake2b.forEach(($) => {
      expect(blake2b(
        Uint8Array.fromHex($.in),
        Uint8Array.fromHex($.key),
        $.hash.length >> 1,
      )).toStrictEqual(Uint8Array.fromHex($.hash));
    }));
  await t.step("blake3", () =>
    vectors.default.blake3.cases.forEach(($) => {
      const length = vectors.default.blake3.length;
      const input = Uint8Array.from({ length: $.input }, (_, z) => z % 251);
      expect(blake3(
        input,
        undefined,
        length,
      )).toStrictEqual(Uint8Array.fromHex($.hash));
      expect(blake3(
        input,
        new TextEncoder().encode(vectors.default.blake3.key),
        length,
      )).toStrictEqual(Uint8Array.fromHex($.keyed));
      expect(blake3(
        input,
        vectors.default.blake3.context,
        length,
      )).toStrictEqual(Uint8Array.fromHex($.derive));
    }));
});
Deno.test("sha256() follows built-in digest", () =>
  fc.assert(fc.asyncProperty(fc.uint8Array(), async ($) => {
    expect(sha256($)).toStrictEqual(
      new Uint8Array(await crypto.subtle.digest("SHA-256", $)),
    );
  })));
Deno.test("sha384() follows built-in digest", () =>
  fc.assert(fc.asyncProperty(fc.uint8Array(), async ($) => {
    expect(sha384($)).toStrictEqual(
      new Uint8Array(await crypto.subtle.digest("SHA-384", $)),
    );
  })));
Deno.test("sha512() follows built-in digest", () =>
  fc.assert(fc.asyncProperty(fc.uint8Array(), async ($) => {
    expect(sha512($)).toStrictEqual(
      new Uint8Array(await crypto.subtle.digest("SHA-512", $)),
    );
  })));
Deno.test("sha224() follows @std/crypto digestSync", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    expect(sha224($)).toStrictEqual(
      new Uint8Array(std.subtle.digestSync("SHA-224", $)),
    );
  })));
Deno.test("sha256() follows @std/crypto digestSync", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    expect(sha256($)).toStrictEqual(
      new Uint8Array(std.subtle.digestSync("SHA-256", $)),
    );
  })));
Deno.test("sha384() follows @std/crypto digestSync", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    expect(sha384($)).toStrictEqual(
      new Uint8Array(std.subtle.digestSync("SHA-384", $)),
    );
  })));
Deno.test("sha512() follows @std/crypto digestSync", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    expect(sha512($)).toStrictEqual(
      new Uint8Array(std.subtle.digestSync("SHA-512", $)),
    );
  })));
Deno.test("hmac() follows built-in sign", () =>
  fc.assert(fc.asyncProperty(
    fc.uint8Array({ minLength: 1 }),
    fc.uint8Array(),
    async (key, data) => {
      expect(hmac(key, data)).toStrictEqual(
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
Deno.test("hkdf() follows built-in deriveBits", () =>
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
      expect(actual).toStrictEqual(new Uint8Array(bits));
    },
  )));
Deno.test("blake2s() follows @std/crypto digestSync", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    expect(blake2s($)).toStrictEqual(
      new Uint8Array(std.subtle.digestSync("BLAKE2S", $)),
    );
  })));
Deno.test("blake2b() follows @std/crypto digestSync", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    expect(blake2b($)).toStrictEqual(
      new Uint8Array(std.subtle.digestSync("BLAKE2B", $)),
    );
  })));
Deno.test("blake() follows @std/crypto digestSync", () =>
  fc.assert(fc.property(fc.uint8Array(), ($) => {
    expect(blake3($)).toStrictEqual(
      new Uint8Array(std.subtle.digestSync("BLAKE3", $)),
    );
  })));
import.meta.main && await Promise.all([
  Promise.all(Array.from([224, 256, 384, 512], (size) =>
    fetch(
      `https://raw.githubusercontent.com/usnistgov/ACVP-Server/fb44dce5257aba23088256e63c9b950db6967610/gen-val/json-files/SHA2-${size}-1.0/internalProjection.json`,
    ).then<
      { testGroups: { tests: { msg: string; len: number; md: string }[] }[] }
    >(($) => $.json()).then(($) =>
      $.testGroups[0].tests.filter(($) => $.len % 8 === 0).map(($) => ({
        data: $.msg,
        digest: $.md,
      }))
    ))),
  fetch(
    "https://raw.githubusercontent.com/C2SP/wycheproof/427a648c39e2edea11b75bcdcd72eea3da482d6f/testvectors_v1/hmac_sha256_test.json",
  ).then<{
    testGroups: {
      tests: {
        key: string;
        msg: string;
        tag: string;
        result: "valid" | "invalid";
      }[];
    }[];
  }>(($) => $.json()),
  fetch(
    "https://raw.githubusercontent.com/C2SP/wycheproof/427a648c39e2edea11b75bcdcd72eea3da482d6f/testvectors_v1/hkdf_sha256_test.json",
  ).then<{
    testGroups: {
      tests: {
        ikm: string;
        salt: string;
        info: string;
        size: number;
        okm: string;
        result: "valid" | "invalid";
      }[];
    }[];
  }>(($) => $.json()),
  Promise.all(Array.from("sb", (flavor) =>
    fetch(
      `https://raw.githubusercontent.com/BLAKE2/BLAKE2/eec32b7170d8dbe4eb59c9afad2ee9297393fb5b/testvectors/blake2${flavor}-kat.txt`,
    ).then(($) => $.text()).then(($) =>
      $.trim().split("\n\n").map((chunk) =>
        Object.fromEntries(chunk.split("\n").map((line) => line.split(":\t")))
      )
    ))),
  fetch(
    "https://raw.githubusercontent.com/BLAKE3-team/BLAKE3/ae3e8e6b3a5ae3190ca5d62820789b17886a0038/test_vectors/test_vectors.json",
  ).then<{
    key: string;
    context_string: string;
    cases: {
      input_len: number;
      hash: string;
      keyed_hash: string;
      derive_key: string;
    }[];
  }>(($) => $.json()),
]).then(([nist, hmac, hkdf, blake2, blake3]) => {
  return {
    sha224: nist[0],
    sha256: nist[1],
    sha384: nist[2],
    sha512: nist[3],
    hmac: hmac.testGroups.flatMap((group) =>
      group.tests.map(($) => ({
        key: $.key,
        data: $.msg,
        tag: $.tag,
        result: $.result === "valid",
      }))
    ),
    hkdf: hkdf.testGroups.flatMap((group) =>
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
  };
}).then(($) =>
  Deno.writeTextFile(
    new URL(import.meta.resolve("./vectors.json")).pathname,
    JSON.stringify($),
  )
);
