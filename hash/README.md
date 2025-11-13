# @libn/hash

Cryptographic hash functions.

## sha2

[SHA-224, SHA-256, SHA-384, and SHA-512](https://www.rfc-editor.org/rfc/rfc6234).

```ts
import { sha256 } from "@libn/hash/sha2";
import { assertEquals } from "@std/assert";

const data = crypto.getRandomValues(new Uint8Array(100));
assertEquals(sha256(data).buffer, await crypto.subtle.digest("SHA-256", data));
```

## hmac

[HMAC-SHA256](https://www.rfc-editor.org/rfc/rfc2104) and
[HKDF-SHA256](https://www.rfc-editor.org/rfc/rfc5869).

```ts
import { hkdf, hmac } from "@libn/hash/hmac";
import { assertEquals } from "@std/assert";

const key = crypto.getRandomValues(new Uint8Array(32));
const data = crypto.getRandomValues(new Uint8Array(100));
assertEquals(
  hmac(key, data).buffer,
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
);
assertEquals(
  hkdf(key).buffer,
  await crypto.subtle.deriveBits(
    {
      name: "HKDF",
      hash: "SHA-256",
      info: new Uint8Array(),
      salt: new Uint8Array(),
    },
    await crypto.subtle.importKey("raw", key, "HKDF", false, ["deriveBits"]),
    256,
  ),
);
```

## blake2

[BLAKE2s and BLAKE2b](https://www.rfc-editor.org/rfc/rfc7693).

```ts
import { blake2b, blake2s } from "@libn/hash/blake2";
import { assertEquals } from "@std/assert";
import { crypto } from "@std/crypto";

const data = crypto.getRandomValues(new Uint8Array(100));
assertEquals(blake2s(data).buffer, await crypto.subtle.digest("BLAKE2S", data));
assertEquals(blake2b(data).buffer, await crypto.subtle.digest("BLAKE2B", data));
```

## blake3

[BLAKE3](https://github.com/BLAKE3-team/BLAKE3) hashing, keyed hashing, and key
derivation.

```ts
import { blake3 } from "@libn/hash/blake3";
import { assertEquals, assertNotEquals } from "@std/assert";
import { crypto } from "@std/crypto";

const data = crypto.getRandomValues(new Uint8Array(100));
const key1 = crypto.getRandomValues(new Uint8Array(32));
const key2 = crypto.getRandomValues(new Uint8Array(32));

// Mode `hash`
assertEquals(blake3(data).buffer, await crypto.subtle.digest("BLAKE3", data));

// Mode `keyed_hash`
assertNotEquals(blake3(data, key1, 512), blake3(data, key2, 512));

// Mode `derive_key`
assertNotEquals(blake3(key1), blake3(key2));
assertNotEquals(blake3(key1, "context 1"), blake3(key1, "context 2"));
```
