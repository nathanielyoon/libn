# @libn/base

Binary-to-text encoding.

## b16

[Base16](https://www.rfc-editor.org/rfc/rfc4648#section-8) uses hexadecimal
characters ("0-9" and "A-F"). Encoding is always uppercase (diverging from
[Number.prototype.toString](https://dev.mozilla.org/Web/JavaScript/Reference/Global_Objects/Number/toString)
and
[Uint8Array.prototype.toHex](https://dev.mozilla.org/Web/JavaScript/Reference/Global_Objects/Uint8Array/toHex),
which use lowercase "a-f"), and decoding is case-insensitive.

```ts
import { deB16, enB16 } from "@libn/base/b16";
import { assertEquals } from "@std/assert";

const binary = new TextEncoder().encode("Hello :)");
assertEquals(enB16(binary), "48656C6C6F203A29");
assertEquals(deB16("48656C6C6F203A29"), binary);
```

## b32

[Base32](https://www.rfc-editor.org/rfc/rfc4648#section-6) uses uppercase
letters and digits, excluding "0", "1", "8", and "9". Encoding is always
uppercase, and decoding is case-insensitive.

```ts
import { deB32, enB32 } from "@libn/base/b32";
import { assertEquals } from "@std/assert";

const binary = new TextEncoder().encode("Hello :)");
assertEquals(enB32(binary), "JBSWY3DPEA5CS");
assertEquals(deB32("JBSWY3DPEA5CS"), binary);
```

## h32

[Base32hex](https://www.rfc-editor.org/rfc/rfc4648#section-7) uses digits and
uppercase letters, excluding "W-Z". Encoding is always uppercase, and decoding
is case-insensitive.

```ts
import { deH32, enH32 } from "@libn/base/h32";
import { assertEquals } from "@std/assert";

const binary = new TextEncoder().encode("Hello :)");
assertEquals(enH32(binary), "91IMOR3F40T2I");
assertEquals(deH32("91IMOR3F40T2I"), binary);
```

## c32

[Crockford base 32](https://crockford.com/base32) uses digits and uppercase
letters, excluding "I", "L", "O", and "U". Encoding is always uppercase, and
decoding is case-insensitive, and additionally accepts hyphens (which don't
affect the output) and substitutes "I", "L", and "O" characters for their
similar-looking numeric counterparts ("1", "1", and "0", respectively).

```ts
import { deC32, enC32 } from "@libn/base/c32";
import { assertEquals } from "@std/assert";

const binary = new TextEncoder().encode("Hello :)");
assertEquals(enC32(binary), "91JPRV3F40X2J");
assertEquals(deC32("91JPRV3F40X2J"), binary);
```

## b58

[Base58](https://github.com/bitcoin/bitcoin/blob/master/src/base58.h) uses
alphanumeric characters, excluding "0", "I", "O", and "l".

```ts
import { deB58, enB58 } from "@libn/base/b58";
import { assertEquals } from "@std/assert";

const binary = new TextEncoder().encode("Hello :)");
assertEquals(enB58(binary), "D7LMXYjUZJQ");
assertEquals(deB58("D7LMXYjUZJQ"), binary);
```

## b64

[Base64](https://www.rfc-editor.org/rfc/rfc4648#section-4) uses alphanumeric
characters and "+" and "/", and "=" for padding.

```ts
import { deB64, enB64 } from "@libn/base/b64";
import { assertEquals } from "@std/assert";

const binary = new TextEncoder().encode("Hello :)");
assertEquals(enB64(binary), "SGVsbG8gOik=");
assertEquals(deB64("SGVsbG8gOik="), binary);
```

## u64

[Base64url](https://www.rfc-editor.org/rfc/rfc4648#section-5) uses alphanumeric
characters and "-" and "_". Padding is neither encoded nor decoded.

```ts
import { deU64, enU64 } from "@libn/base/u64";
import { assertEquals, assertMatch } from "@std/assert";

const binary = new TextEncoder().encode("Hello :)");
assertEquals(enU64(binary), "SGVsbG8gOik");
assertEquals(deU64("SGVsbG8gOik"), binary);
```

## z85

[Z85](https://rfc.zeromq.org/spec/32) uses printable, non-whitespace ASCII
characters, excluding '"', "'", ",", ";", "\\", "_", "`", "|", and "~". Unlike
the [original](https://rfc.zeromq.org/spec/32/#formal-specification), the binary
input length doesn't have to be a multiple of 4, the encoding and decoding
functions add and remove padding automatically.

```ts
import { deZ85, enZ85 } from "@libn/base/z85";
import { assertEquals, assertMatch } from "@std/assert";

const binary = new TextEncoder().encode("Hello :)");
assertEquals(enZ85(binary), "nm=QNzY?7&");
assertEquals(deZ85("nm=QNzY?7&"), binary);
```

## a85

[Ascii85](https://en.wikipedia.org/wiki/Ascii85) uses the first 85 printable,
non-whitespace ASCII characters, as well as "z" to compress sequences of 4 empty
bytes. Unlike the [original](https://en.wikipedia.org/wiki/Ascii85#Limitations),
the binary input length doesn't have to be a multiple of 4, the encoding and
decoding functions add and remove padding automatically.

```ts
import { deA85, enA85 } from "@libn/base/a85";
import { assertEquals } from "@std/assert";

const binary = new TextEncoder().encode("Hello :)");
assertEquals(enA85(binary), "87cURD]h(i");
assertEquals(deA85("87cURD]h(i"), binary);
```
