# @libn/xchachapoly

XChaCha20-Poly1305 authenticated encryption and XChaCha20 stream cipher.

```sh
deno add jsr:@libn/xchachapoly

npx jsr add @libn/xchachapoly
npm install @libn/xchachapoly

bunx jsr add @libn/xchachapoly
bun add @libn/xchachapoly
```

- [RFC 8439](https://www.rfc-editor.org/rfc/rfc8439)
- [poly1305-donna](https://github.com/floodyberry/poly1305-donna)
- [draft-irtf-cfrg-xchacha](https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-xchacha)

## default

```ts
import { cipher, decrypt, encrypt } from "@libn/xchachapoly";
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
