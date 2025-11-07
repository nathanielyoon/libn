# @libn/fuzzy

Fuzzy-match strings.

```sh
deno add jsr:@libn/fuzzy

npx jsr add @libn/fuzzy
npm install @libn/fuzzy

bunx jsr add @libn/fuzzy
bun add @libn/fuzzy
```

## default

```ts
import { distance, includes } from "@libn/fuzzy";
import { assertEquals } from "@std/assert";

// Check for general presence
assertEquals(includes("a b c", "abc"), true);

// Or calculate exact Levenshtein distance
assertEquals(distance("a b c", "abc"), 2);
```
