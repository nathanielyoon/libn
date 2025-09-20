/**
 * Short [querySelector](https://dev.mozilla.org/Web/API/Element/querySelector),
 * [querySelectorAll](https://dev.mozilla.org/Web/API/Element/querySelectorAll),
 * and [createElement](https://dev.mozilla.org/Web/API/Document/createElement).
 *
 * @example Create elements
 * ```ts
 * import { assertEquals } from "@std/assert";
 * import { DOMParser, Element } from "@b-fuze/deno-dom/native";
 *
 * globalThis.document = new DOMParser().parseFromString("", "text/html") as any;
 * globalThis.Element = Element as any;
 *
 * assertEquals(html("a#a", "a").outerHTML, '<a id="a">a</a>');
 * assertEquals(
 *   html('b.b[data-b="b"]', "b").outerHTML,
 *   '<b class="b" data-b="b">b</b>',
 * );
 * ```
 *
 * @example Query document
 * ```ts
 * import { DOMParser } from "@b-fuze/deno-dom/native";
 * import { assertEquals } from "@std/assert";
 *
 * globalThis.document = new DOMParser().parseFromString(
 *   '<a id="a">a</a><b class="b"><b class="b">b</b><b data-b="b">b</b></b>',
 *   "text/html",
 * ) as any;
 *
 * assertEquals(qs("a#a")?.textContent, "a");
 * assertEquals(qa('b:is(.b, b[data-b="b"])').length, 3);
 * ```
 *
 * @module dom
 */

import { html } from "./src/create.ts";
import { qa, qs } from "./src/query.ts";

export { html, qa, qs };
