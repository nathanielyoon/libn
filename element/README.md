# @libn/element

Better-typed
[createElement](https://developer.mozilla.org/en-US/docs/Web/API/Document/createElement)
with a mostly-JSX-compatible interface.

## default

```ts
// only necessary in non-browser environments
import { parseHTML } from "linkedom";
globalThis.document = parseHTML("").document;

import { h } from "@libn/element";
import { assertEquals } from "@std/assert";

// HTMLDivElement
const div = h("div", {
  id: "id",
  style: { color: "#111", boxSizing: "border-box" },
}, h("span", { class: "class" }, "text!"));
assertEquals(
  div.outerHTML,
  '<div id="id" style="color:#111;box-sizing:border-box"><span class="class">text!</span></div>',
);
```
