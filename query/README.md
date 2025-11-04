# @libn/query

Wrappers for `document.createElement` and `querySelector`/`querySelectorAll`.

```sh
deno add jsr:@libn/query

npx jsr add @libn/query
npm install @libn/query

bunx jsr add @libn/query
bun add @libn/query
```

- [createElement](https://developer.mozilla.org/en-US/docs/Web/API/Document/createElement)
- [querySelector](https://developer.mozilla.org/en-US/docs/Web/API/Element/querySelector)
- [querySelectorAll](https://developer.mozilla.org/en-US/docs/Web/API/Element/querySelectorAll)

## create

```ts
// only necessary in non-browser environments
import { Document, Element } from "@b-fuze/deno-dom";
globalThis.document = new Document() as any;
globalThis.Element = Element as any;

import { ce } from "@libn/query/create";
import { assertEquals } from "@std/assert";

const div = ce("div", { id: "i" }, ce("span", { class: "c" }, "text"));
assertEquals(div.outerHTML, '<div id="i"><span class="c">text</span></div>');
```

## select

```ts
// only necessary in non-browser environments
import { DOMParser } from "@b-fuze/deno-dom";
globalThis.document = new DOMParser().parseFromString(
  '<div id="i"><span class="c">text</span></div>',
  "text/html",
) as any;

import { qs } from "@libn/query/select";
import { assertEquals } from "@std/assert";

assertEquals(qs("div#i > span.c")?.textContent, "text");
```
