# @libn/element

Better-typed `createElement` with a mostly-JSX-compatible interface.

```sh
deno add jsr:@libn/element

npx jsr add @libn/element
npm install @libn/element

bunx jsr add @libn/element
bun add @libn/element
```

- [createElement](https://developer.mozilla.org/en-US/docs/Web/API/Document/createElement)

## default

```ts
// only necessary in non-browser environments
import { parseHTML } from "linkedom";
globalThis.document = parseHTML("").document;

import { h } from "@libn/element";
import { assertEquals } from "@std/assert";

assertEquals(
  h("div", {
    id: "id",
    style: { color: "#111", boxSizing: "border-box" },
  }, h("span", { class: "class" }, "text!")).outerHTML,
  '<div id="id" style="color:#111;box-sizing:border-box"><span class="class">text!</span></div>',
);
```
