# @libn/nchf

Non-cryptographic hash functions.

## oaat

Hashes data and an optional 32-bit seed to a

```ts
import { oaat32 } from "@libn/nchf/oaat";

oaat32(new Uint8Array([1, 2, 3, 4]), 0); // 39f51d9b
oaat32(new Uint8Array([1, 2, 3, 4]), 1); // 66c697fb
oaat32(new Uint8Array([1, 2, 3, 5]), 0); // 4b5d50ad
```

## a5hash

## halfsiphash
