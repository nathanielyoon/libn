# @libn/aead

XChaCha20-Poly1305 authenticated encryption and XChaCha20 stream cipher.

```sh
deno add jsr:@libn/csv

npx jsr add @libn/csv
npm install @libn/csv

bunx jsr add @libn/csv
bun add @libn/csv
```

- [RFC 8439](https://www.rfc-editor.org/rfc/rfc8439)
- [poly1305-donna](https://github.com/floodyberry/poly1305-donna)
- [draft-irtf-cfrg-xchacha](https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-xchacha)

## default

```ts
import { cipher, decrypt, encrypt } from "@libn/aead";
import { assert, assertEquals, assertNotEquals } from "@std/assert";

const key = crypto.getRandomValues(new Uint8Array(32));
const plaintext = crypto.getRandomValues(new Uint8Array(100));
const data = crypto.getRandomValues(new Uint8Array(100));

const ciphertext = new Uint8Array(plaintext);
const iv = crypto.getRandomValues(new Uint8Array(24));

// Encrypt
const secret = encrypt(key, plaintext, data);
assert(secret);

// Or stream directly
cipher(key, iv, ciphertext);
assertNotEquals(ciphertext, plaintext);

// Decrypt with additional data
assertEquals(decrypt(key, secret, data), plaintext);
assertEquals(decrypt(key, secret), null);

// Or stream directly
cipher(key, iv, ciphertext);
assertEquals(ciphertext, plaintext);
```
