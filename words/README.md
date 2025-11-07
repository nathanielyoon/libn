# @libn/words

Convert between case formats.

```sh
deno add jsr:@libn/words

npx jsr add @libn/words
npm install @libn/words

bunx jsr add @libn/words
bun add @libn/words
```

- [Multiple-word identifier formats](https://en.wikipedia.org/wiki/Naming_convention_(programming)#Examples_of_multiple-word_identifier_formats)

## default

```ts
import {
  lowerCamel,
  lowerKebab,
  lowerSnake,
  upperCamel,
  upperKebab,
  upperSnake,
} from "@libn/words";
import { assertEquals } from "@std/assert";

let words = "This is a set of words";

assertEquals(words = lowerCamel(words), "thisIsASetOfWords");
assertEquals(words = upperCamel(words), "ThisIsASetOfWords");
assertEquals(words = lowerKebab(words), "this-is-a-set-of-words");
assertEquals(words = upperKebab(words), "This-Is-A-Set-Of-Words");
assertEquals(words = lowerSnake(words), "this_is_a_set_of_words");
assertEquals(words = upperSnake(words), "THIS_IS_A_SET_OF_WORDS");
```
