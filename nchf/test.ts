import { a5hash32, a5hash64 } from "@libn/nchf/a5hash";
import { oaat32 } from "@libn/nchf/oaat";
import { assert, assertEquals } from "@std/assert";
import fc from "fast-check";
import { get, set } from "../test.ts";
import { type U64, umul32, umul64 } from "./lib.ts";
import vectors from "./vectors.json" with { type: "json" };

const zip = async ($: BlobPart, use: CompressionStream | DecompressionStream) =>
  new Uint8Array((await Array.fromAsync(
    new Blob([$]).stream().pipeThrough(use),
  )).flatMap(($) => [...$]));
type Size<A extends string> = A extends `${string}${infer B}`
  ? B extends "32" | "64" ? `u${B}` : Size<B>
  : never;
const size = <A extends string>($: A) => `u${$.slice(-2)}` as Size<A>;
const ffi = async <A extends keyof typeof vectors>(hash: A) => {
  const url = await Deno.makeTempFile();
  await Deno.writeFile(
    url,
    await zip(
      Uint8Array.fromBase64(vectors[hash]),
      new DecompressionStream("gzip"),
    ),
  );
  return [
    url,
    Deno.dlopen(url, {
      ffi: { parameters: ["buffer", "usize", size(hash)], result: size(hash) },
    }),
  ] as const;
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

Deno.test("oaat.oaat32 : original GoodOAAT", async () => {
  const [url, lib] = await ffi("oaat32");
  fc.assert(fc.property(fc.uint8Array({ size: "large" }), fcU32, ($, seed) => {
    assertEquals(oaat32($, seed), lib.symbols.ffi($, BigInt($.length), seed));
  }));
  lib.close(), await Deno.remove(url);
});

Deno.test("a5hash.a5hash32 : original a5hash32", async () => {
  const [url, lib] = await ffi("a5hash32");
  fc.assert(fc.property(fc.uint8Array({ size: "large" }), fcU32, ($, seed) => {
    assertEquals(a5hash32($, seed), lib.symbols.ffi($, BigInt($.length), seed));
  }));
  lib.close(), await Deno.remove(url);
});
Deno.test("a5hash.a5hash64 : original a5hash", async () => {
  const [url, lib] = await ffi("a5hash64");
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

import.meta.main && Promise.all([
  get`/rurban/smhasher/3931fd6f723f4fb2afab6ef9a628912220e90ce7/Hashes.cpp${6967}${7785}`,
  get`/avaneev/a5hash/b0ba799928c9aa8ef5ac764a1d3060e48b4797c3/a5hash.h`,
]).then(([oaat, a5hash]) =>
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
  })).then(([oaat32, a5hash32, a5hash64]) => ({ oaat32, a5hash32, a5hash64 }))
).then(set(import.meta));
