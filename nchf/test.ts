import { a5hash32, a5hash64 } from "@libn/nchf/a5hash";
import { oaat32 } from "@libn/nchf/oaat";
import { assert, assertEquals } from "@std/assert";
import fc from "fast-check";
import { get, set } from "../test.ts";
import { type U64, umul32, umul64 } from "./lib.ts";
import { halfsiphash32, halfsiphash64 } from "@libn/nchf/halfsiphash";
import vectors from "./vectors.json" with { type: "json" };

const zip = async ($: BlobPart, use: CompressionStream | DecompressionStream) =>
  new Uint8Array((await Array.fromAsync(
    new Blob([$]).stream().pipeThrough(use),
  )).flatMap(($) => [...$]));
type Size<A extends string> = A extends `${string}${infer B}`
  ? B extends "32" | "64" ? `u${B}` : Size<B>
  : never;
const ffi = async <const A extends Deno.ForeignLibraryInterface[string]>(
  source: string,
  symbol: A,
) => {
  const url = await Deno.makeTempFile();
  await Deno.writeFile(
    url,
    await zip(
      Uint8Array.fromBase64(source),
      new DecompressionStream("gzip"),
    ),
  );
  return [Deno.dlopen(url, { ffi: symbol }), url] as const;
};
const fcU32 = fc.double({
  min: 0,
  max: -1 >>> 0,
  noDefaultInfinity: true,
  noNaN: true,
}).map(($) => $ >>> 0);
const fcU64 = fc.bigInt({ min: 0n, max: (1n << 64n) - 1n }).map(($) => ({
  bigint: $,
  number: deBig($),
}));
const enBig = ($: U64) => BigInt($.hi) << 32n | BigInt($.lo);
const deBig = ($: bigint) => (
  { hi: Number($ >> 32n), lo: Number($ & 0xffffffffn) } satisfies U64
);

Deno.test("lib.umul32 : 32-bit integers", () => {
  fc.assert(fc.property(fcU32, fcU32, (one, two) => {
    const bigint = BigInt(one) * BigInt(two), number = umul32(one, two);
    assertEquals(enBig(number), bigint);
    assertEquals(number, deBig(bigint));
  }));
});
Deno.test("lib.umul64 : 64-bit integers", () => {
  fc.assert(fc.property(fcU64, fcU64, (one, two) => {
    const bigint = one.bigint * two.bigint;
    umul64(one.number, two.number);
    assertEquals(enBig(one.number), bigint & 0xffffffffffffffffn);
    assertEquals(enBig(two.number), bigint >> 64n);
  }));
});

Deno.test("oaat.oaat32 :: original GoodOAAT", async () => {
  const [lib, url] = await ffi(vectors.oaat32, {
    parameters: ["buffer", "usize", "u32"],
    result: "u32",
  });
  fc.assert(fc.property(fc.uint8Array({ size: "large" }), fcU32, ($, seed) => {
    assertEquals(oaat32($, seed), lib.symbols.ffi($, BigInt($.length), seed));
  }));
  lib.close(), await Deno.remove(url);
});

Deno.test("a5hash.a5hash32 :: original a5hash32", async () => {
  const [lib, url] = await ffi(vectors.a5hash32, {
    parameters: ["buffer", "usize", "u32"],
    result: "u32",
  });
  fc.assert(fc.property(fc.uint8Array({ size: "large" }), fcU32, ($, seed) => {
    assertEquals(a5hash32($, seed), lib.symbols.ffi($, BigInt($.length), seed));
  }));
  lib.close(), await Deno.remove(url);
});
Deno.test("a5hash.a5hash64 :: original a5hash", async () => {
  const [lib, url] = await ffi(vectors.a5hash64, {
    parameters: ["buffer", "usize", "u64"],
    result: "u64",
  });
  fc.assert(fc.property(
    fc.uint8Array({ size: "large" }),
    fc.bigInt({ min: 0n, max: 0xffffffffffffffffn }),
    ($, seed) => {
      assertEquals(
        a5hash64($, seed),
        lib.symbols.ffi($, BigInt($.length), seed),
      );
    },
  ));
  lib.close(), await Deno.remove(url);
});

Deno.test("halfsiphash : vectors", () => {
  const data = new Uint8Array(64), key = Uint8Array.from(Array(16).keys());
  for (let z = 0; z < 64; ++z) {
    data[z] = z;
    assertEquals(
      halfsiphash32(data.subarray(0, z), key).toString(16).padStart(8, "0"),
      vectors.halfsiphash[0][z],
    );
    assertEquals(
      halfsiphash64(data.subarray(0, z), key).toString(16).padStart(16, "0"),
      vectors.halfsiphash[1][z],
    );
  }
});
Deno.test("halfsiphash.halfsiphash32 :: original halfsiphash32", async () => {
  const [lib, url] = await ffi(vectors.halfsiphash32, {
    parameters: ["buffer", "usize", "buffer"],
    result: "u32",
  });
  fc.assert(fc.property(
    fc.uint8Array({ size: "large" }),
    fc.uint8Array({ minLength: 8, maxLength: 8 }),
    ($, key) => {
      assertEquals(
        halfsiphash32($, key),
        lib.symbols.ffi($, BigInt($.length), key),
      );
    },
  ));
  lib.close(), await Deno.remove(url);
});
Deno.test("halfsiphash.halfsiphash64 :: original halfsiphash64", async () => {
  const [lib, url] = await ffi(vectors.halfsiphash64, {
    parameters: ["buffer", "usize", "buffer"],
    result: "u64",
  });
  fc.assert(fc.property(
    fc.uint8Array({ size: "large" }),
    fc.uint8Array({ minLength: 8, maxLength: 8 }),
    ($, key) => {
      assertEquals(
        halfsiphash64($, key),
        lib.symbols.ffi($, BigInt($.length), key),
      );
    },
  ));
  lib.close(), await Deno.remove(url);
});

import.meta.main && Promise.all([
  get`/rurban/smhasher/3931fd6f723f4fb2afab6ef9a628912220e90ce7/Hashes.cpp${6967}${7785}`,
  get`/avaneev/a5hash/b0ba799928c9aa8ef5ac764a1d3060e48b4797c3/a5hash.h`,
  get`/veorq/SipHash/eee7d0d84dc7731df2359b243aa5e75d85f6eaef/halfsiphash.c${545}`,
  get`/veorq/SipHash/371dd98e3508045bc8346da3ed8225b76ce536f6/vectors.h${23275}`,
]).then(([oaat, a5hash, halfsiphash, vectors]) =>
  Promise.all([
    `#include <cstddef>
#include <cstdint>
extern "C" uint32_t ffi(uint8_t *key, size_t len, uint32_t seed) ${
      oaat.replace("*(uint32_t *) out =", "return")
    }`,
    `${a5hash}
extern "C" uint32_t ffi(uint8_t *key, size_t len, uint32_t seed) {
  return a5hash32(key, len, seed);
}`,
    `${a5hash}
extern "C" uint64_t ffi(uint8_t *key, size_t len, uint64_t seed) {
  return a5hash(key, len, seed);
}`,
    `${halfsiphash}
extern "C" uint32_t ffi(uint8_t *in, size_t inlen, uint8_t *key) {
  uint8_t out[4];
  halfsiphash(in, inlen, key, out, 4);
  return (uint32_t)out[0] | (uint32_t)out[1] << 8 | (uint32_t)out[2] << 16 |
         (uint32_t)out[3] << 24;
}`,
    `${halfsiphash}
extern "C" uint64_t ffi(uint8_t *in, size_t inlen, uint8_t *key) {
  uint8_t out[8];
  halfsiphash(in, inlen, key, out, 8);
  return (uint64_t)out[0] | (uint64_t)out[1] << 8 | (uint64_t)out[2] << 16 |
         (uint64_t)out[3] << 24 | (uint64_t)out[4] << 32 | (uint64_t)out[5] << 40 |
         (uint64_t)out[6] << 48 | (uint64_t)out[7] << 56;
}`,
  ].map(async (cpp) => {
    const tmp = await Deno.makeTempDir();
    await Deno.writeTextFile(`${tmp}/lib.cpp`, cpp);
    assert(
      (await new Deno.Command("g++", {
        args: ["-shared", "-o", `${tmp}/lib.so`, `${tmp}/lib.cpp`],
      }).output()).success,
    );
    const bin = await Deno.readFile(`${tmp}/lib.so`);
    const [compressed] = await Promise.all([
      zip(bin, new CompressionStream("gzip")),
      await Deno.remove(tmp, { recursive: true }),
    ]);
    return compressed.toBase64();
  })).then(([oaat32, a5hash32, a5hash64, halfsiphash32, halfsiphash64]) => ({
    oaat32,
    a5hash32,
    a5hash64,
    halfsiphash: vectors.match(/\{.+?^\}/gms)!.map((version) =>
      version.match(/(?:0x[\da-f]{2},\s+)+/g)!.map((vector) =>
        vector.match(/[\da-f]{2}/g)!.reverse().join("")
      )
    ),
    halfsiphash32,
    halfsiphash64,
  }))
).then(set(import.meta));
