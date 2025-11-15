# @libn/aead

XChaCha20-Poly1305 authenticated encryption and XChaCha20 stream cipher.

## default

[ChaCha20-Poly1305](https://www.rfc-editor.org/rfc/rfc8439) AEAD scheme with
[extended nonces](https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-xchacha).

```ts
import { cipher, decrypt, encrypt } from "@libn/aead";
import { assert, assertEquals, assertNotEquals } from "@std/assert";

const key = crypto.getRandomValues(new Uint8Array(32));
const plaintext = crypto.getRandomValues(new Uint8Array(100));
const data = crypto.getRandomValues(new Uint8Array(100));

const secret = encrypt(key, plaintext, data);
assert(secret);
assertEquals(decrypt(key, secret, data), plaintext);
assertEquals(decrypt(key, secret), null);

// Or stream directly
const ciphertext = new Uint8Array(plaintext);
const iv = crypto.getRandomValues(new Uint8Array(24));
cipher(key, iv, ciphertext);
assertNotEquals(ciphertext, plaintext);
cipher(key, iv, ciphertext);
assertEquals(ciphertext, plaintext);
```
