import { get, set, zip } from "../test.ts";

const [oaat, a5hash, halfsiphash, vectors] = await Promise.all([
  get`/rurban/smhasher/3931fd6f723f4fb2afab6ef9a628912220e90ce7/Hashes.cpp${6967}${7785}`,
  get`/avaneev/a5hash/b0ba799928c9aa8ef5ac764a1d3060e48b4797c3/a5hash.h`,
  get`/veorq/SipHash/eee7d0d84dc7731df2359b243aa5e75d85f6eaef/halfsiphash.c${545}`,
  get`/veorq/SipHash/371dd98e3508045bc8346da3ed8225b76ce536f6/vectors.h${23275}`,
]);

const lib = await Promise.all([
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
  const output = await new Deno.Command("g++", {
    args: ["-shared", "-o", `${tmp}/lib.so`, `${tmp}/lib.cpp`],
  }).output();
  if (!output.success) throw Error(new TextDecoder().decode(output.stdout));
  const bin = await Deno.readFile(`${tmp}/lib.so`);
  const [compressed] = await Promise.all([
    zip(bin, new CompressionStream("gzip")),
    await Deno.remove(tmp, { recursive: true }),
  ]);
  return compressed.toBase64();
}));
await set(import.meta, {
  oaat32: lib[0],
  a5hash32: lib[1],
  a5hash64: lib[2],
  halfsiphash32: lib[3],
  halfsiphash64: lib[4],
  halfsiphash: vectors.match(/\{.+?^\}/gms)!.map((version) =>
    version.match(/(?:0x[\da-f]{2},\s+)+/g)!.map(($) =>
      $.match(/[\da-f]{2}/g)!.reverse().join("")
    )
  ),
});
