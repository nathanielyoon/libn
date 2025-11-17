# @libn/paseto

[Platform-agnostic security tokens](https://paseto.io/).

## local

Version 4 symmetric authenticated encryption.

```ts
import { deLocal, enLocal, keyLocal } from "@libn/paseto/local4";
import { assert, assertEquals } from "@std/assert";

const key = keyLocal();
const payload = new TextEncoder().encode("Local message");
const footer = crypto.getRandomValues(new Uint8Array(20));

const token = enLocal(key, payload, footer);
assert(token);
assertEquals(deLocal(key, token), { payload, footer });
```

## public

Version 4 asymmetric authentication.

```ts
import { dePublic, enPublic, keyPair } from "@libn/paseto/public4";
import { assert, assertEquals } from "@std/assert";

const keys = keyPair();
const payload = new TextEncoder().encode("Public message");
const footer = crypto.getRandomValues(new Uint8Array(20));

const token = enPublic(keys.secret, payload, footer);
assert(token);
assertEquals(dePublic(keys.public, token), { payload, footer });
```
