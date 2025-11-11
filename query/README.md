# @libn/query

Better-typed `querySelector` and `querySelectorAll`.

```sh
deno add jsr:@libn/query

npx jsr add @libn/query
npm install @libn/query

bunx jsr add @libn/query
bun add @libn/query
```

- [querySelector](https://developer.mozilla.org/en-US/docs/Web/API/Element/querySelector)
- [querySelectorAll](https://developer.mozilla.org/en-US/docs/Web/API/Element/querySelectorAll)

## default

```ts
import { parseHTML } from "linkedom";

import { queryFirst } from "@libn/query";
import { assertEquals } from "@std/assert";

assertEquals(
  queryFirst(
    "div#i > span.c",
    parseHTML('<div id="i"><span class="c">text</span></div>').document,
  )?.textContent,
  "text",
);
```
