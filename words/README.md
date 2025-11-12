# @libn/words

Convert between case formats.

## default

[Multiple-word identifier formats](https://en.wikipedia.org/wiki/Naming_convention_(programming)#Examples_of_multiple-word_identifier_formats)
supported:

- lowerCamel
- UpperCamel
- lower-kebab
- Upper-Kebab
- lower_snake
- UPPER_SNAKE

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

const words = "This is a sequence of words";

assertEquals(lowerCamel(words), "thisIsASequenceOfWords");
assertEquals(upperCamel(words), "ThisIsASequenceOfWords");
assertEquals(lowerKebab(words), "this-is-a-sequence-of-words");
assertEquals(upperKebab(words), "This-Is-A-Sequence-Of-Words");
assertEquals(lowerSnake(words), "this_is_a_sequence_of_words");
assertEquals(upperSnake(words), "THIS_IS_A_SEQUENCE_OF_WORDS");
```
