# @libn/ecc

Curve25519 key exchange and digital signatures.

```sh
deno add jsr:@libn/ecc

npx jsr add @libn/aead
npm install @libn/aead

bunx jsr add @libn/aead
bun add @libn/aead
```

- [RFC 7748](https://www.rfc-editor.org/rfc/rfc7748)
- [RFC 8032](https://www.rfc-editor.org/rfc/rfc8032)
- [noble-ed25519](https://github.com/paulmillr/noble-ed25519)

## x25519

```ts
import { assertEquals } from "@std/assert";

// Alice has a secret key
const secretKeyA = crypto.getRandomValues(new Uint8Array(32));

// Bob has a secret key
const secretKeyB = crypto.getRandomValues(new Uint8Array(32));

// They share their public keys
const publicKeyA = derive(secretKeyA); // A sends to B
const publicKeyB = derive(secretKeyB); // B sends to A

// And agree on a shared secret
const sharedAB = exchange(secretKeyA, publicKeyB);
const sharedBA = exchange(secretKeyB, publicKeyA);
assertEquals(sharedAB, sharedBA);
```

## ed25519

```ts
import { assert } from "@std/assert";

const message = crypto.getRandomValues(new Uint8Array(100));

// Only you know this value
const secretKey = crypto.getRandomValues(new Uint8Array(32));

// So only you can make this signature
const signature = sign(secretKey, message);

// Share your public key to prove it
const publicKey = generate(secretKey);
assert(verify(publicKey, message, signature));
```
