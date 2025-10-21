import { assertEquals, assertNotEquals } from "@std/assert";
import fc from "fast-check";
import { crypto as std } from "@std/crypto";
import { deUtf8, enUtf8 } from "@libn/base";
import { iv, multiply, perm } from "./lib.ts";
import * as integer from "@libn/hash/integer";
import { sha224, sha256, sha384, sha512 } from "@libn/hash/sha2";
import { hkdf, hmac } from "@libn/hash/hmac";
import { blake2b, blake2s } from "@libn/hash/blake2";
import { blake3 } from "@libn/hash/blake3";
import vectors from "./vectors.json" with { type: "json" };

const fcUint = fc.double({
  min: 0,
  max: -1 >>> 0,
  noDefaultInfinity: true,
  noNaN: true,
}).map(($) => $ >>> 0);
Deno.test("lib", async (t) => {
  await t.step("iv() parses base16", () => {
    fc.assert(fc.property(fc.uint32Array({ minLength: 1 }), ($) => {
      assertEquals(
        iv(Array.from($, (int) => int.toString(16).padStart(8, "0")).join("")),
        $,
      );
    }));
  });
  await t.step("perm() parses base16", () => {
    fc.assert(fc.property(fc.uint8Array({ max: 15 }), ($) => {
      const base = $.reduce((hex, byte) => hex + byte.toString(16), "");
      assertEquals(perm(base), $);
      assertEquals(perm(base.split("")), $);
      for (let z = 0; z <= 4; ++z) {
        assertEquals(perm(base, z), $.map((byte) => byte << z));
      }
    }));
  });
  await t.step("multiply() multiplies", () => {
    fc.assert(fc.property(fcUint, fcUint, (one, two) => {
      const product = BigInt(one) * BigInt(two);
      const { hi, lo } = multiply(one, two);
      assertEquals(BigInt(hi >>> 0) * 0x100000000n + BigInt(lo >>> 0), product);
      assertEquals(hi >>> 0, Number(product >> 32n));
      assertEquals(lo >>> 0, Number(product & 0xffffffffn));
    }));
  });
});
const run = async ($: Deno.ChildProcess, stdin: string) => {
  const writer = $.stdin.getWriter();
  await writer.write(enUtf8(stdin));
  await writer.close();
  const out = await $.output();
  if (!out.success) throw Error(deUtf8(out.stderr), { cause: out.code });
  return out.stdout;
};
Deno.test("integer", async (t) => {
  for (const $ of ["oaat", "a5hash"] as const) {
    await t.step(`${$}() follows original implementation`, async () => {
      const path = `${import.meta.dirname}/${$}.out`;
      await Deno.writeFile(path, Uint8Array.fromHex(vectors[$]), {
        mode: 0o755,
      });
      const out = new Deno.Command(path, {
        stdin: "piped",
        stdout: "piped",
        stderr: "piped",
      });
      const hash = integer[$];
      await fc.assert(fc.asyncProperty(
        fc.string({ size: "medium" }),
        fcUint,
        async ($, seed) => {
          assertEquals(
            hash(enUtf8($), seed),
            parseInt(deUtf8(await run(out.spawn(), `${$}\n${seed}`))),
          );
        },
      ));
      await Deno.remove(path);
    });
  }
});
Deno.test("sha2", async (t) => {
  await t.step("sha224() passes reference vectors", () => {
    for (const $ of vectors.sha224) {
      assertEquals(
        sha224(Uint8Array.fromHex($.data)),
        Uint8Array.fromHex($.digest),
      );
    }
  });
  await t.step("sha256() passes reference vectors", () => {
    for (const $ of vectors.sha256) {
      assertEquals(
        sha256(Uint8Array.fromHex($.data)),
        Uint8Array.fromHex($.digest),
      );
    }
  });
  await t.step("sha384() passes reference vectors", () => {
    for (const $ of vectors.sha384) {
      assertEquals(
        sha384(Uint8Array.fromHex($.data)),
        Uint8Array.fromHex($.digest),
      );
    }
  });
  await t.step("sha512() passes reference vectors", () => {
    for (const $ of vectors.sha512) {
      assertEquals(
        sha512(Uint8Array.fromHex($.data)),
        Uint8Array.fromHex($.digest),
      );
    }
  });
  await t.step("sha256() follows built-in digest", async () => {
    await fc.assert(fc.asyncProperty(fc.uint8Array(), async ($) => {
      assertEquals(
        sha256($),
        new Uint8Array(await crypto.subtle.digest("SHA-256", $)),
      );
    }));
  });
  await t.step("sha384() follows built-in digest", async () => {
    await fc.assert(fc.asyncProperty(fc.uint8Array(), async ($) => {
      assertEquals(
        sha384($),
        new Uint8Array(await crypto.subtle.digest("SHA-384", $)),
      );
    }));
  });
  await t.step("sha512() follows built-in digest", async () => {
    await fc.assert(fc.asyncProperty(fc.uint8Array(), async ($) => {
      assertEquals(
        sha512($),
        new Uint8Array(await crypto.subtle.digest("SHA-512", $)),
      );
    }));
  });
  await t.step("sha224() follows @std/crypto digestSync", () => {
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      assertEquals(
        sha224($),
        new Uint8Array(std.subtle.digestSync("SHA-224", $)),
      );
    }));
  });
  await t.step("sha256() follows @std/crypto digestSync", () => {
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      assertEquals(
        sha256($),
        new Uint8Array(std.subtle.digestSync("SHA-256", $)),
      );
    }));
  });
  await t.step("sha384() follows @std/crypto digestSync", () => {
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      assertEquals(
        sha384($),
        new Uint8Array(std.subtle.digestSync("SHA-384", $)),
      );
    }));
  });
  await t.step("sha512() follows @std/crypto digestSync", () => {
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      assertEquals(
        sha512($),
        new Uint8Array(std.subtle.digestSync("SHA-512", $)),
      );
    }));
  });
});
Deno.test("hmac", async (t) => {
  await t.step("hmac() passes reference vectors", () => {
    for (const $ of vectors.hmac) {
      const tag = hmac(
        Uint8Array.fromHex($.key),
        Uint8Array.fromHex($.data),
      ).subarray(0, $.tag.length >> 1);
      if ($.result) assertEquals(tag, Uint8Array.fromHex($.tag));
      else assertNotEquals(tag, Uint8Array.fromHex($.tag));
    }
  });
  await t.step("hkdf() passes reference vectors", () => {
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
  await t.step("hmac() follows built-in sign", async () => {
    await fc.assert(fc.asyncProperty(
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
    ));
  });
  await t.step("hkdf() follows built-in deriveBits", async () => {
    await fc.assert(fc.asyncProperty(
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
    ));
  });
});
Deno.test("blake2", async (t) => {
  await t.step("blake2s() passes reference vectors", () => {
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
  await t.step("blake2b() passes reference vectors", () => {
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
  await t.step("blake2s() follows @std/crypto digestSync", () => {
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      assertEquals(
        blake2s($),
        new Uint8Array(std.subtle.digestSync("BLAKE2S", $)),
      );
    }));
  });
  await t.step("blake2b() follows @std/crypto digestSync", () => {
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      assertEquals(
        blake2b($),
        new Uint8Array(std.subtle.digestSync("BLAKE2B", $)),
      );
    }));
  });
});
Deno.test("blake3", async (t) => {
  await t.step("blake3() passes reference vectors", () => {
    const key = new TextEncoder().encode(vectors.blake3.key);
    const context = vectors.blake3.context;
    const length = vectors.blake3.length;
    for (const $ of vectors.blake3.cases) {
      const input = Uint8Array.from({ length: $.input }, (_, z) => z % 251);
      assertEquals(
        blake3(input, undefined, length),
        Uint8Array.fromHex($.hash),
      );
      assertEquals(blake3(input, key, length), Uint8Array.fromHex($.keyed));
      assertEquals(
        blake3(input, context, length),
        Uint8Array.fromHex($.derive),
      );
    }
  });
  await t.step("blake3() follows @std/crypto digestSync", () => {
    fc.assert(fc.property(fc.uint8Array(), ($) => {
      assertEquals(
        blake3($),
        new Uint8Array(std.subtle.digestSync("BLAKE3", $)),
      );
    }));
  });
});
import.meta.main && await Promise.all([
  Promise.all([
    fetch(
      "https://raw.githubusercontent.com/rurban/smhasher/3931fd6f723f4fb2afab6ef9a628912220e90ce7/Hashes.cpp",
    ).then(($) => $.text()).then(($) =>
      `#include <cassert>
#include <cstdint>
#include <iostream>

${$.slice(6690, 7787)}

int main(void) {
  std::string key;
  assert(std::getline(std::cin, key));

  uint32_t seed;
  std::cin >> seed;

  uint32_t out;
  GoodOAAT(key.c_str(), key.size(), seed, &out);
  std::cout << out << std::endl;

  return 0;
}
`
    ),
    fetch(
      "https://raw.githubusercontent.com/avaneev/a5hash/c9ce07aad514ef7073f1436e5bed26310aab8c2c/a5hash.h",
    ).then(($) => $.text()).then(($) =>
      `#include <iostream>
#include <cassert>

${$}

int main(void) {
	std::string Msg0;
	assert(std::getline(std::cin, Msg0));

	uint32_t seed;
	std::cin >> seed;

	std::cout << a5hash32(Msg0.c_str(), Msg0.size(), seed) << std::endl;

	return 0;
}
`
    ),
  ]).then(($) =>
    Array.fromAsync($, async (cpp) => {
      await run(
        new Deno.Command("g++", {
          args: ["-x", "c++", "-"],
          stdin: "piped",
          stdout: "piped",
          stderr: "piped",
        }).spawn(),
        cpp,
      );
      const bin = await Deno.readFile("./a.out");
      await Deno.remove("./a.out");
      return bin.toHex();
    })
  ),
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
]).then(([cpp, nist, hmac, hkdf, blake2, blake3]) => ({
  oaat: cpp[0],
  a5hash: cpp[1],
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
})).then(($) =>
  Deno.writeTextFile(`${import.meta.dirname}/vectors.json`, JSON.stringify($))
);
