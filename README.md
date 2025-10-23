# libn

Standard library of minimal, low-level functions. All packages and their exports
were something I needed for some project or another, and are standardized or
simple enough as to not require much upkeep. Each directory has a `deno.json`
configuration file, a primary `mod.ts` entrypoint, a full-coverage suite in
`test.ts`, and additional submodules as needed.

```sh
deno add jsr:@libn/aead # or other package
npm add @libn/aead
```

- [aead](https://github.com/nathanielyoon/libn/tree/main/aead): authenticated
  encryption
  ([XChaCha20](https://datatracker.ietf.org/doc/html/draft-irtf-cfrg-xchacha),
  [Poly1305](https://www.rfc-editor.org/rfc/rfc8439))
- [base](https://github.com/nathanielyoon/libn/tree/main/base): binary-to-text
  encoding
  ([base16, base32/base32hex, base64/base64url](https://www.rfc-editor.org/rfc/rfc4648)
  [Crockford base32](https://crockford.com/base32),
  [base58](https://github.com/bitcoin/bitcoin/blob/master/src/base58.h),
  [Z85](https://rfc.zeromq.org/spec/32/),
  [Ascii85](https://en.wikipedia.org/wiki/Ascii85))
- [csv](https://github.com/nathanielyoon/libn/tree/main/csv):
  parsing/stringifying
  [comma-separated values](https://www.rfc-editor.org/rfc/rfc4180)
- [ecc](https://github.com/nathanielyoon/libn/tree/main/ecc): Curve25519
  [key exchange](https://www.rfc-editor.org/rfc/rfc7748) and
  [signatures](https://www.rfc-editor.org/rfc/rfc8032)
- [fp](https://github.com/nathanielyoon/libn/tree/main/fp): functional
  [result type](https://en.wikipedia.org/wiki/Result_type)
- [hash](https://github.com/nathanielyoon/libn/tree/main/hash): cryptographic
  ([SHA-224/SHA-256/SHA-384/SHA-512](https://www.rfc-editor.org/rfc/rfc6234),
  [HMAC-SHA256](https://www.rfc-editor.org/rfc/rfc2104),
  [HKDF-SHA256](https://www.rfc-editor.org/rfc/rfc5869),
  [BLAKE2s/BLAKE2b](https://www.rfc-editor.org/rfc/rfc7693),
  [BLAKE3](https://github.com/BLAKE3-team/BLAKE3)) and non-cryptographic
  ([oaat32](https://github.com/rurban/smhasher/commit/3931fd6f723f4fb2afab6ef9a628912220e90ce7),
  [a5hash](https://github.com/avaneev/a5hash)) hash functions
- [query](https://github.com/nathanielyoon/libn/tree/main/query): element
  [creation](https://developer.mozilla.org/en-US/docs/Web/API/Document/createElement)
  and
  [selection](https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector)
- [text](https://github.com/nathanielyoon/libn/tree/main/query): string matching
  ([code point subsets](https://www.rfc-editor.org/rfc/rfc9839), normalizing
  [newlines](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#line_terminators)/[whitespace](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#white_space)/[diacritics](https://en.wikipedia.org/wiki/Diacritic),
  [escaping html](https://developer.mozilla.org/en-US/docs/Glossary/Character_reference),
  [escaping regex](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/escape),
  [case folding](https://www.unicode.org/reports/tr21/tr21-5.html),
  [fuzzy matching](https://en.wikipedia.org/wiki/Approximate_string_matching),
  [Levenshtein distance](https://en.wikipedia.org/wiki/Levenshtein_distance))
