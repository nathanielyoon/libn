# @libn/element

Better-typed
[createElement](https://developer.mozilla.org/en-US/docs/Web/API/Document/createElement)
with a mostly-JSX-compatible interface.

## default

```ts
// Only necessary in non-browser environments.
import { parseHTML } from "linkedom";
globalThis.document = parseHTML("").document;

import { h } from "@libn/create";
import { assertEquals } from "@std/assert";

const div = h("div", {
  id: "id",
  style: { color: "#111", boxSizing: "border-box" },
}, h("span", { class: "class" }, "text!")); // type is HTMLDivElement
assertEquals(
  div.outerHTML,
  '<div id="id" style="color:#111;box-sizing:border-box"><span class="class">text!</span></div>',
);
```
