import { assert, assertEquals, assertNotEquals } from "@std/assert";
import fc from "fast-check";
import { crypto as std } from "@std/crypto";
import { deUtf8, enUtf8 } from "@libn/base/utf";
import {
  add128,
  deInteger,
  enInteger,
  iv,
  mul128,
  mul64,
  perm,
} from "./lib.ts";
import { a5hash32, a5hash64, oaat32 } from "./integer.ts";
import { Rng } from "./rng.ts";
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
const U64 = 0xffffffffffffffffn;
const fcBigUint = fc.bigInt({ min: 0n, max: U64 });
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
  await t.step("mul64() multiplies 64 bits", () => {
    fc.assert(fc.property(fcUint, fcUint, (one, two) => {
      const big = BigInt(one) * BigInt(two) & U64;
      const pair = mul64(one, two);
      assertEquals(deInteger(pair), big);
      assertEquals({ hi: pair.hi >>> 0, lo: pair.lo >>> 0 }, enInteger(big));
    }));
  });
  await t.step("add128() adds 128 bits", () => {
    fc.assert(fc.property(fcBigUint, fcBigUint, (one, two) => {
      const big = one + two & U64;
      const pair = enInteger(one);
      add128(pair, enInteger(two));
      assertEquals(deInteger(pair), big);
      assertEquals({ hi: pair.hi >>> 0, lo: pair.lo >>> 0 }, enInteger(big));
    }));
  });
  await t.step("mul128() multiplies 128 bits", () => {
    fc.assert(fc.property(fcBigUint, fcBigUint, (one, two) => {
      const big = one * two;
      const pair1 = enInteger(one);
      const pair2 = enInteger(two);
      mul128(pair1, pair2);
      assertEquals(deInteger(pair2), big >> 64n);
      assertEquals(
        { hi: pair2.hi >>> 0, lo: pair2.lo >>> 0 },
        enInteger(big >> 64n),
      );
      assertEquals(deInteger(pair1), big & U64);
      assertEquals(
        { hi: pair1.hi >>> 0, lo: pair1.lo >>> 0 },
        enInteger(big & U64),
      );
    }));
  });
});
const bin = async (
  name: "oaat" | "a5hash" | "oorandom",
  run: (
    spawn: (stdin: string, args?: string[]) => Promise<string>,
  ) => Promise<void>,
) => {
  const path = `${import.meta.dirname}/${name}`;
  await Deno.writeFile(path, Uint8Array.fromBase64(vectors[name]), {
    mode: 0o755,
  });
  await run(async (stdin, args = []) => {
    const child = new Deno.Command(
      path,
      { args, stdin: "piped", stdout: "piped", stderr: "piped" },
    ).spawn();
    const writer = child.stdin.getWriter();
    await writer.write(enUtf8(stdin));
    await writer.close();
    const out = await child.output();
    if (!out.success) throw Error(deUtf8(out.stderr), { cause: out.code });
    return deUtf8(out.stdout);
  });
  await Deno.remove(path);
};
const run = async ($: Deno.ChildProcess, stdin: string) => {
  const writer = $.stdin.getWriter();
  await writer.write(enUtf8(stdin));
  await writer.close();
  const out = await $.output();
  if (!out.success) throw Error(deUtf8(out.stderr), { cause: out.code });
  return deUtf8(out.stdout).trim();
};
Deno.test("integer", async (t) => {
  await t.step("oaat() follows original implementation", async () => {
    await bin("oaat", (spawn) =>
      fc.assert(fc.asyncProperty(
        fc.string({ size: "medium" }),
        fcUint,
        async ($, seed) => {
          assertEquals(
            oaat32(enUtf8($), seed),
            +(await spawn(`${$}\n${seed}`)),
          );
        },
      )));
  });
  await bin("a5hash", async (spawn) => {
    await t.step("a5hash32() follows original implementation", async () => {
      await fc.assert(fc.asyncProperty(
        fc.string({ size: "medium" }),
        fcUint,
        async ($, seed) => {
          assertEquals(
            a5hash32(enUtf8($), seed),
            +(await spawn(`${$}\n${seed}`, ["\x20"])),
          );
        },
      ));
    });
    await t.step("a5hash64() follows original implementation", async () => {
      await fc.assert(fc.asyncProperty(
        fc.string({ size: "medium" }),
        fcBigUint,
        async ($, seed) => {
          const [hi, lo] = (await spawn(`${$}\n${seed}`, ["\x40"])).split(" ");
          assertEquals(a5hash64(enUtf8($), seed), { hi: +hi, lo: +lo });
        },
      ));
    });
  });
});
Deno.test("rng", async (t) => {
  const fcBigint = fc.bigInt({ min: 0n, max: 0xffffffffffffffffn });
  await t.step("Rng.make() follows original implementation", async () => {
    await bin("oorandom", (spawn) =>
      fc.assert(
        fc.asyncProperty(
          fcBigint,
          fcBigint,
          fc.array(
            fc.tuple(fcUint, fcUint).map(($) =>
              $.sort((one, two) => one - two)
            ),
            { minLength: 1 },
          ),
          async (seed, increment, ranges) => {
            const rng = Rng.make(seed, increment);
            assertEquals(
              ranges.map(($) => [
                rng.i32(),
                rng.u32(),
                rng.f32(),
                rng.bounded($[1], $[0]),
              ]),
              (await spawn(
                `${seed}\n${increment}\n${
                  ranges.map(($) => $.join(" ")).join("\n")
                }`,
              )).trim().split("\n").map((line) => {
                const [i32, u32, f32, bounded] = line.split(/\s+/);
                return [+i32, +u32, Math.fround(+f32), +bounded];
              }),
            );
          },
        ),
        { examples: [[0n, 0n, [[0, 2147733257]]]] }, // triggers float rejection
      ));
  });
  await t.step("Rng.load() recreates state", () => {
    fc.assert(fc.property(fcBigint, fcBigint, (seed, increment) => {
      const rng = Rng.make(seed, increment);
      assertEquals(Rng.load(rng.save()).i32(), rng.i32());
    }));
  });
  await t.step("Rng() implements IterableIterator", () => {
    fc.assert(fc.property(
      fcBigint,
      fcBigint,
      fc.nat({ max: 1e3 }),
      (seed, increment, length) => {
        const one = Rng.make(seed, increment), two = Rng.make(seed, increment);
        assert(one[Symbol.iterator]() === one);
        assertEquals(one.next(), { value: two.i32(), done: false });
        assertEquals(
          one.take(length).toArray(),
          Array.from({ length: length }, () => two.i32()),
        );
      },
    ));
  });
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

int main(int argc, char **argv) {
  if (argc != 2)
    return 1;

  std::string Msg0;
  assert(std::getline(std::cin, Msg0));

  uint64_t seed;
  std::cin >> seed;

  switch (argv[1][0]) {
  case '\x20': {
    uint32_t hash = a5hash32(Msg0.c_str(), Msg0.size(), seed);
    std::cout << hash << std::endl;
    break;
  }
  case '\x40': {
    uint64_t hash = a5hash(Msg0.c_str(), Msg0.size(), seed);
    std::cout << (hash >> 32) << " " << (hash & 0xffffffff) << std::endl;
    break;
  }
  default:
    return 1;
  }

  return 0;
}
`
    ),
  ]).then(($) =>
    Array.fromAsync($, async (cpp) => {
      try {
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
        return bin.toBase64();
      } catch { /* empty */ }
    })
  ),
  fetch(
    "https://hg.sr.ht/~icefox/oorandom/raw/src/lib.rs?rev=69053548c8352ac59ec5bf682def2ffa06cfab9c",
  ).then(($) => $.text()).then(($) => `use std${$.slice(887, 6254)}`).then(
    async (oorandom) => {
      try {
        await Deno.mkdir("./rs/src", { recursive: true });
        await Promise.all([
          Deno.writeTextFile(
            "./rs/Cargo.toml",
            '[package]\nname = "oorandom"\n',
          ),
          Deno.writeTextFile("./rs/src/oorandom.rs", oorandom),
          Deno.writeTextFile(
            "./rs/src/main.rs",
            `#[allow(dead_code)]
mod oorandom;

fn read() -> Option<String> {
    let mut input = String::new();
    match std::io::stdin().read_line(&mut input) {
        Ok(_) => Some(input),
        Err(_) => None,
    }
}

fn main() {
    let mut rng = oorandom::Rand32::new_inc(
        read().unwrap().trim().parse().unwrap(),
        read().unwrap().trim().parse().unwrap(),
    );
    loop {
        match read().map(|line| {
            line.split_whitespace()
                .map(|s| s.parse().unwrap())
                .collect::<Vec<u32>>()
        }) {
            Some(vec) if vec.len() == 2 => {
                println!(
                    "{} {} {} {}",
                    rng.rand_i32(),
                    rng.rand_u32(),
                    rng.rand_float(),
                    rng.rand_range(std::ops::Range {
                        start: vec[0],
                        end: vec[1]
                    })
                );
            }
            _ => break,
        }
    }
}
`,
          ),
        ]);
        const { success, stderr } = await new Deno.Command("cargo", {
          args: ["build", "--release"],
          cwd: "./rs",
        }).output();
        assert(success, new TextDecoder().decode(stderr));
        const bin = await Deno.readFile("./rs/target/release/oorandom");
        await Deno.remove("./rs", { recursive: true });
        return bin.toBase64();
      } catch {
        return compiled.oorandom;
      }
    },
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
]).then(([cpp, oorandom, nist, hmac, hkdf, blake2, blake3]) => ({
  oaat: cpp[0] ?? compiled.oaat,
  a5hash: cpp[1] ?? compiled.a5hash,
  oorandom,
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
