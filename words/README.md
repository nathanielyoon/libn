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

const words = "This is a set of words";

assertEquals(lowerCamel(words), "thisIsASetOfWords");
assertEquals(upperCamel(words), "ThisIsASetOfWords");
assertEquals(lowerKebab(words), "this-is-a-set-of-words");
assertEquals(upperKebab(words), "This-Is-A-Set-Of-Words");
assertEquals(lowerSnake(words), "this_is_a_set_of_words");
assertEquals(upperSnake(words), "THIS_IS_A_SET_OF_WORDS");
```
