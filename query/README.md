# @libn/query

Better-typed
[querySelector](https://dev.mozilla.org/docs/Web/API/Element/querySelector) and
[querySelectorAll](https://dev.mozilla.org/docs/Web/API/Element/querySelectorAll).

## default

```ts
import { queryFirst } from "@libn/query";
import { parseHTML } from "linkedom";
import { assertEquals } from "@std/assert";

const span = queryFirst(
  "div#i > span.c",
  // Only necessary in non-browser environments.
  parseHTML('<div id="i"><span class="c">text</span></div>').document,
); // type is HTMLSpanElement
assertEquals(span?.textContent, "text");
```
