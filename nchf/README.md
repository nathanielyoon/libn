# @libn/nchf

Non-cryptographic hash functions.

## oaat

[32-bit seeded hash](https://github.com/rurban/smhasher/commit/3931fd6f723f4fb2afab6ef9a628912220e90ce7/).

```ts
import { oaat32 } from "@libn/nchf/oaat";

oaat32(new Uint8Array([0, 1, 2, 3]), 0); // e7d12840
oaat32(new Uint8Array([0, 1, 2, 3]), 1); // 80ea5ab8
oaat32(new Uint8Array([0, 1, 2, 4]), 0); // 9080e04c
```

## a5hash

[32-bit and 64-bit seeded hashes](https://github.com/avaneev/a5hash).

```ts
import { a5hash32, a5hash64 } from "@libn/nchf/a5hash";

a5hash32(new Uint8Array([0, 1, 2, 3]), 0); // 5c78d6a6
a5hash32(new Uint8Array([0, 1, 2, 3]), 1); // 97c63c95
a5hash32(new Uint8Array([0, 1, 2, 4]), 0); // d252f967

a5hash64(new Uint8Array([0, 1, 2, 3]), 0n); // 72585f77d63bbd56
a5hash64(new Uint8Array([0, 1, 2, 3]), 1n); // 7b8fd954a91ba3ed
a5hash64(new Uint8Array([0, 1, 2, 4]), 0n); // c6ab2ffce1a74b56
```

## halfsiphash

[32-bit and 64-bit keyed hashes](https://github.com/veorq/SipHash).

```ts
import { halfsiphash32, halfsiphash64 } from "@libn/nchf/halfsiphash";

halfsiphash32(new Uint8Array([0, 1, 2, 3]), new Uint8Array(8).fill(0)); // abeeaa6d
halfsiphash32(new Uint8Array([0, 1, 2, 3]), new Uint8Array(8).fill(1)); // f167aa09
halfsiphash32(new Uint8Array([0, 1, 2, 4]), new Uint8Array(8).fill(0)); // 26affe00

halfsiphash64(new Uint8Array([0, 1, 2, 3]), new Uint8Array(8).fill(0)); // 5ad7d3cf8dcbf2b9
halfsiphash64(new Uint8Array([0, 1, 2, 3]), new Uint8Array(8).fill(1)); // a2c6ee6ab51b12fa
halfsiphash64(new Uint8Array([0, 1, 2, 4]), new Uint8Array(8).fill(0)); // 6dbe762a1eb369ba
```
