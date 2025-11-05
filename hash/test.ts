import { assert, assertEquals, assertNotEquals } from "@std/assert";
import fc from "fast-check";
import { crypto as std } from "@std/crypto";
import { deUtf8, enUtf8 } from "@libn/base/utf";
import { iv, perm, umul } from "./lib.ts";
import { a5hash32, a5hash64, oaat32 } from "./integer.ts";
import { sha224, sha256, sha384, sha512 } from "./sha2.ts";
import { hkdf, hmac } from "./hmac.ts";
import { blake2b, blake2s } from "./blake2.ts";
import { blake3 } from "./blake3.ts";
import compiled from "./compiled.json" with { type: "json" };
import vectors from "./vectors.json" with { type: "json" };

const fcUint = fc.double({
  min: 0,
  max: -1 >>> 0,
  noDefaultInfinity: true,
  noNaN: true,
}).map(($) => $ >>> 0);
Deno.test("lib.iv() parses base16", () =>
  fc.assert(fc.property(fc.uint32Array({ minLength: 1 }), ($) => {
    assertEquals(
      iv(Array.from($, (int) => int.toString(16).padStart(8, "0")).join("")),
      $,
    );
  })));
Deno.test("lib.perm() parses base16", () =>
  fc.assert(fc.property(fc.uint8Array({ max: 15 }), ($) => {
    const base = $.reduce((hex, byte) => hex + byte.toString(16), "");
    assertEquals(perm(base), $);
    assertEquals(perm(base.split("")), $);
    for (let z = 0; z <= 4; ++z) {
      assertEquals(perm(base, z), $.map((byte) => byte << z));
    }
  })));
Deno.test("lib.mul64() multiplies 64 bits", () =>
  fc.assert(fc.property(fcUint, fcUint, (one, two) => {
    const big = BigInt(one) * BigInt(two), pair = umul(one, two);
    assertEquals(BigInt(pair.hi >>> 0) << 32n | BigInt(pair.lo >>> 0), big);
    assertEquals({ hi: pair.hi >>> 0, lo: pair.lo >>> 0 }, {
      hi: Number(big >> 32n),
      lo: Number(big & 0xffffffffn),
    });
  })));
const stream = async ($: ReadableStream<Uint8Array<ArrayBuffer>>) => {
  const chunks = await Array.fromAsync($);
  let size = 0;
  for (let z = 0; z < chunks.length; ++z) size += chunks[z].length;
  const buffer = new Uint8Array(size);
  for (let z = 0, y = 0; z < chunks.length; ++z) {
    buffer.set(chunks[z], y), y += chunks[z].length;
  }
  return buffer;
};
const run = async (
  bin: string,
  test: (
    hash: (data: string, seed: string) => Promise<string>,
  ) => Promise<void>,
) => {
  const path = await Deno.makeTempFile();
  await Deno.writeFile(
    path,
    await stream(
      new Blob([Uint8Array.fromBase64(bin)]).stream().pipeThrough(
        new DecompressionStream("gzip"),
      ),
    ),
    { mode: 0o755 },
  );
  await test(async (data, seed) => {
    const out = await new Deno.Command(path, {
      args: [data, seed],
    }).output();
    if (!out.success) throw Error(deUtf8(out.stderr), { cause: out.code });
    return deUtf8(out.stdout);
  });
  await Deno.remove(path);
};
Deno.test("integer.oaat32() follows original implementation", () =>
  run(vectors.oaat32, (hash) =>
    fc.assert(fc.asyncProperty(
      fc.string({ size: "medium" }),
      fcUint,
      async ($, seed) => {
        assertEquals(oaat32(enUtf8($), seed), +(await hash($, `${seed}`)));
      },
    ))));
Deno.test("integer.a5hash32() follows original implementation", () =>
  run(vectors.a5hash32, (hash) =>
    fc.assert(fc.asyncProperty(
      fc.string({ size: "medium" }),
      fcUint,
      async ($, seed) => {
        assertEquals(a5hash32(enUtf8($), seed), +(await hash($, `${seed}`)));
      },
    ))));
Deno.test("integer.a5hash64() follows original implementation", () =>
  run(vectors.a5hash64, (hash) =>
    fc.assert(fc.asyncProperty(
      fc.string({ size: "medium" }),
      fc.bigInt({ min: 0n, max: 0xffffffffffffffffn }),
      async ($, seed) => {
        assertEquals(
          a5hash64(enUtf8($), seed),
          BigInt(await hash($, `${seed}`)),
        );
      },
    ))));
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
  Promise.all([
    fetch(
      "https://raw.githubusercontent.com/rurban/smhasher/3931fd6f723f4fb2afab6ef9a628912220e90ce7/Hashes.cpp",
    ).then(($) => $.text()).then(($) =>
      `#include <cstdint>
#include <cstring>
#include <iostream>

${$.slice(6690, 7787)}

int main(int argc, char **argv) {
  uint32_t out;
  GoodOAAT(argv[1], strlen(argv[1]), strtoul(argv[2], NULL, 10), &out);
  std::cout << out << std::endl;

  return 0;
}
`
    ),
    fetch(
      "https://raw.githubusercontent.com/avaneev/a5hash/c9ce07aad514ef7073f1436e5bed26310aab8c2c/a5hash.h",
    ).then(($) => $.text()).then(($) => [
      `#include <cstdlib>
#include <iostream>

${$}

int main(int argc, char **argv) {
  std::cout << a5hash32(argv[1], strlen(argv[1]), strtoul(argv[2], NULL, 10))
            << std::endl;

  return 0;
}`,
      `#include <cstdlib>
#include <iostream>

${$}

int main(int argc, char **argv) {
  std::cout << a5hash(argv[1], strlen(argv[1]), strtoull(argv[2], NULL, 10))
            << std::endl;

  return 0;
}`,
    ]),
  ]).then(($) =>
    Array.fromAsync($.flat(), async (cpp) => {
      const path = await Deno.makeTempDir();
      await Deno.writeTextFile(`${path}/main.cpp`, cpp);
      const out = await new Deno.Command("g++", {
        args: ["-o", "main.out", "main.cpp"],
        cwd: path,
      }).output();
      assert(out.success, new TextDecoder().decode(out.stderr));
      const bin = await stream(
        new Blob([await Deno.readFile(`${path}/main.out`)]).stream()
          .pipeThrough(new CompressionStream("gzip")),
      );
      await Deno.remove(path, { recursive: true });
      return bin.toBase64();
    })
  ).then(async ($) => {
    const recompiled = { oaat32: $[0], a5hash32: $[1], a5hash64: $[2] };
    await Deno.writeTextFile(
      `${import.meta.dirname}/compiled.json`,
      JSON.stringify(recompiled),
    );
    return recompiled;
  }).catch(() => compiled),
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
  ...cpp,
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
