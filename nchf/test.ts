import { a5hash32, a5hash64 } from "@libn/nchf/a5hash";
import { halfsiphash32, halfsiphash64 } from "@libn/nchf/halfsiphash";
import { oaat32 } from "@libn/nchf/oaat";
import { assertEquals } from "@std/assert";
import fc from "fast-check";
import { fcBin, zip } from "../test.ts";
import { type U64, umul32, umul64 } from "./lib.ts";
import vectors from "./vectors.json" with { type: "json" };

const load = async <const A extends Deno.ForeignFunction>(
  source: string,
  definition: A,
) => {
  const url = await Deno.makeTempFile();
  await Deno.writeFile(
    url,
    await zip(Uint8Array.fromBase64(source), new DecompressionStream("gzip")),
  );
  const library = Deno.dlopen(url, { ffi: definition });
  return Object.assign(library.symbols.ffi!, {
    [Symbol.asyncDispose]: () => (library.close(), Deno.remove(url)),
  });
};
const enBig = ($: U64) => BigInt($.hi) << 32n | BigInt($.lo);
const deBig = ($: bigint) => (
  { hi: Number($ >> 32n), lo: Number($ & 0xffffffffn) } satisfies U64
);
const fcU32 = fc.nat({ max: -1 >>> 0 });
const fcU64 = fc.bigInt({ min: 0n, max: (1n << 64n) - 1n }).map(($) => ({
  bigint: $,
  number: deBig($),
}));
const ignore = { ignore: !Deno.dlopen };

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

Deno.test("oaat.oaat32 :: GoodOAAT.cpp", ignore, async () => {
  await using ffi = await load(vectors.oaat32, {
    parameters: ["buffer", "usize", "u32"],
    result: "u32",
  });
  fc.assert(fc.property(fcBin(), fcU32, ($, seed) => {
    assertEquals(oaat32($, seed), ffi($, BigInt($.length), seed));
  }));
});

Deno.test("a5hash.a5hash32 :: a5hash.h", ignore, async () => {
  await using ffi = await load(vectors.a5hash32, {
    parameters: ["buffer", "usize", "u32"],
    result: "u32",
  });
  fc.assert(fc.property(fcBin(), fcU32, ($, seed) => {
    assertEquals(a5hash32($, seed), ffi($, BigInt($.length), seed));
  }));
});
Deno.test("a5hash.a5hash64 :: a5hash.h", ignore, async () => {
  await using ffi = await load(vectors.a5hash64, {
    parameters: ["buffer", "usize", "u64"],
    result: "u64",
  });
  fc.assert(fc.property(fcBin(), fcU64, ($, { bigint }) => {
    assertEquals(a5hash64($, bigint), ffi($, BigInt($.length), bigint));
  }));
});

Deno.test("halfsiphash : vectors", () => {
  const data = new Uint8Array(64), key = Uint8Array.from(Array(16).keys());
  for (let z = 0; z < 64; ++z) {
    data[z] = z;
    assertEquals(
      halfsiphash32(data.subarray(0, z), key),
      parseInt(vectors.halfsiphash[0][z], 16),
    );
    assertEquals(
      halfsiphash64(data.subarray(0, z), key),
      BigInt("0x" + vectors.halfsiphash[1][z]),
    );
  }
});
Deno.test("halfsiphash.halfsiphash32 :: halfsiphash.c", ignore, async () => {
  await using ffi = await load(vectors.halfsiphash32, {
    parameters: ["buffer", "usize", "buffer"],
    result: "u32",
  });
  fc.assert(fc.property(fcBin(), fcBin(8), ($, key) => {
    assertEquals(halfsiphash32($, key), ffi($, BigInt($.length), key));
  }));
});
Deno.test("halfsiphash.halfsiphash64 :: halfsiphash.c", ignore, async () => {
  await using ffi = await load(vectors.halfsiphash64, {
    parameters: ["buffer", "usize", "buffer"],
    result: "u64",
  });
  fc.assert(fc.property(fcBin(), fcBin(8), ($, key) => {
    assertEquals(halfsiphash64($, key), ffi($, BigInt($.length), key));
  }));
});
