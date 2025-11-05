# @libn/text

String utilities.

```sh
deno add jsr:@libn/text

npx jsr add @libn/text
npm install @libn/text

bunx jsr add @libn/text
bun add @libn/text
```

- [Multiple-word identifier formats](https://en.wikipedia.org/wiki/Naming_convention_(programming)#Examples_of_multiple-word_identifier_formats)
- [RFC 9839](https://www.rfc-editor.org/rfc/rfc9839.txt)
- [Javascript line terminators](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#line_terminators)
- [Javascript white space](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Lexical_grammar#white_space)
- [RegExp.escape](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp/escape)
- [Unicode case folding](https://www.unicode.org/Public/UNIDATA/CaseFolding.txt)
- [fuzzysearch](https://github.com/bevacqua/fuzzysearch)
- [fastest-levenshtein](https://github.com/ka-weihe/fastest-levenshtein)

## convert

```ts
import {
  lowerCamel,
  lowerKebab,
  lowerSnake,
  upperCamel,
  upperKebab,
  upperSnake,
} from "@libn/text/convert";
import { assertEquals } from "@std/assert";

let words = "This is a set of words";

assertEquals(words = lowerCamel(words), "thisIsASetOfWords");
assertEquals(words = upperCamel(words), "ThisIsASetOfWords");
assertEquals(words = lowerKebab(words), "this-is-a-set-of-words");
assertEquals(words = upperKebab(words), "This-Is-A-Set-Of-Words");
assertEquals(words = lowerSnake(words), "this_is_a_set_of_words");
assertEquals(words = upperSnake(words), "THIS_IS_A_SET_OF_WORDS");
```

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

## match

```ts
import { distance, includes } from "@libn/text/match";
import { assertEquals } from "@std/assert";

// Check for general presence
assertEquals(includes("a b c", "abc"), true);

// Or calculate exact Levenshtein distance
assertEquals(distance("a b c", "abc"), 2);
```
