import { a5hash32, a5hash64 } from "@libn/nchf/a5hash";
import { halfsiphash32, halfsiphash64 } from "@libn/nchf/halfsiphash";
import { oaat32 } from "@libn/nchf/oaat";
import { assertEquals } from "@std/assert";
import fc from "fast-check";
import { zip } from "../test.ts";
import { type U64, umul32, umul64 } from "./lib.ts";
import vectors from "./vectors.json" with { type: "json" };

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
