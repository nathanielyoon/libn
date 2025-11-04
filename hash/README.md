# @libn/aead

Cryptographic and non-cryptographic hash functions.

```sh
deno add jsr:@libn/hash

npx jsr add @libn/hash
npm install @libn/hash

bunx jsr add @libn/hash
bun add @libn/hash
```

- [RFC 6234](https://www.rfc-editor.org/rfc/rfc6234)
- [RFC 2104](https://www.rfc-editor.org/rfc/rfc2104)
- [RFC 5869](https://www.rfc-editor.org/rfc/rfc5869)
- [RFC 7693](https://www.rfc-editor.org/rfc/rfc7693)
- [BLAKE3](https://github.com/BLAKE3-team/BLAKE3)
- [SMHasher3](https://gitlab.com/fwojcik/smhasher3)
- [One-at-a-time hash](https://github.com/rurban/smhasher/commit/3931fd6f723f4fb2afab6ef9a628912220e90ce7)
- [a5hash](https://github.com/avaneev/a5hash)

## integer

```ts
import { a5hash32 } from "@libn/hash/integer"; // or a5hash64, oaat32
import { assertNotEquals } from "@std/assert";

const upper = a5hash32(new TextEncoder().encode("Hello")); // 0x8de32ed8
const lower = a5hash32(new TextEncoder().encode("hello")); // 0xf9172684

assertNotEquals(upper, lower);
```

## sha2

```ts
import { sha256 } from "@libn/hash/sha2"; // or sha256
import { assertEquals } from "@std/assert";

const data = crypto.getRandomValues(new Uint8Array(100));

// Same as Web Crypto, but sync
assertEquals(sha256(data).buffer, await crypto.subtle.digest("SHA-256", data));
```

## hmac

```ts
import { hkdf, hmac } from "@libn/hash/hmac";
import { assertEquals } from "@std/assert";

const key = crypto.getRandomValues(new Uint8Array(32));
const data = crypto.getRandomValues(new Uint8Array(100));

// HMAC-SHA256 only
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

// HKDF-SHA256 only
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

```ts
import { blake2b, blake2s } from "@libn/hash/blake2";
import { assertEquals } from "@std/assert";
import { crypto } from "@std/crypto";

const data = crypto.getRandomValues(new Uint8Array(100));

// BLAKE2s (32-bit)
assertEquals(blake2s(data).buffer, await crypto.subtle.digest("BLAKE2S", data));

// BLAKE2b (64-bit)
assertEquals(blake2b(data).buffer, await crypto.subtle.digest("BLAKE2B", data));
```

## blake3

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
