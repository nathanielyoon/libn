# @libn/text

String utilities.

```sh
deno add jsr:@libn/text

npx jsr add @libn/text
npm install @libn/text

bunx jsr add @libn/text
bun add @libn/text
```

- [RFC 9839](https://www.rfc-editor.org/rfc/rfc9839.txt)
- [Javascript line terminators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#line_terminators)
- [Javascript white space](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#white_space)
- [RegExp.escape](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/escape)
- [Unicode case folding](https://www.unicode.org/Public/UNIDATA/CaseFolding.txt)
- [fuzzysearch](https://github.com/bevacqua/fuzzysearch)
- [fastest-levenshtein](https://github.com/ka-weihe/fastest-levenshtein)

## normalize

```ts
import { uncode, unline, unlone, unmark, unwide } from "@libn/text/normalize";
import { assertEquals } from "@std/assert";

// This string has some abnormal characters
let string = "\ud800\0\r\n\n\xf1";

// Replace lone surrogates
assertEquals(string = unlone(string), "\ufffd\0\r\n\n\xf1");

// Replace non-Unicode Assignables
assertEquals(string = uncode(string), "\ufffd\ufffd\r\n\n\xf1");

// Replace non-LF breaks
assertEquals(string = unline(string), "\ufffd\ufffd\n\n\xf1");

// Condense whitespace
assertEquals(string = unwide(string), "\ufffd\ufffd\n\xf1");

// Remove diacritics
assertEquals(string = unmark(string), "\ufffd\ufffd\nn");
```

## fold

```ts
import { uncase } from "@libn/text/fold";
import { assertEquals, assertNotEquals } from "@std/assert";

// These strings differ
const one = "FUSS", two = "Fu\xdf";
assertNotEquals(one, two);

// But they match case-insensitively
assertEquals(uncase(one), uncase(two));
```
