# @libn/fuzzy

Fuzzy-match strings.

## default

Check for [general presence](https://github.com/bevacqua/fuzzysearch) or
calculate
[Levenshtein distance](https://github.com/ka-weihe/fastest-levenshtein).

```ts
import { distance, includes } from "@libn/fuzzy";
import { assertEquals } from "@std/assert";

assertEquals(includes("a b c", "abc"), true);
assertEquals(distance("a b c", "abc"), 2);
```
