# @libn/25519

Curve25519 key exchange and digital signatures.

## x25519

[RFC 7748](https://www.rfc-editor.org/rfc/rfc7748) key exchange.

```ts
import { derive, exchange } from "@libn/25519/x25519";
import { assertEquals } from "@std/assert";

const secretKeyA = crypto.getRandomValues(new Uint8Array(32));
const secretKeyB = crypto.getRandomValues(new Uint8Array(32));

const publicKeyA = derive(secretKeyA); // A sends to B
const publicKeyB = derive(secretKeyB); // B sends to A

assertEquals(
  exchange(secretKeyA, publicKeyB),
  exchange(secretKeyB, publicKeyA),
);
```

## ed25519

[RFC 8032](https://www.rfc-editor.org/rfc/rfc8032) digital signatures.

```ts
import { generate, sign, verify } from "@libn/25519/ed25519";
import { assert } from "@std/assert";

const message = crypto.getRandomValues(new Uint8Array(100));
const secretKey = crypto.getRandomValues(new Uint8Array(32));

const signature = sign(secretKey, message);
assert(verify(generate(secretKey), message, signature));
```
