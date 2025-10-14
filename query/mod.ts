/**
 * Wrappers for `document.createElement` and `querySelector`/`querySelectorAll`.
 *
 * @example Usage
 * ```ts
 * // not necessary in browsers
 * import { Document, Element } from "@b-fuze/deno-dom";
 * globalThis.document = new Document() as any;
 * globalThis.Element = Element as any;
 *
 * import { ce } from "@libn/query/create";
 * import { qs } from "@libn/query/select";
 * import { assertEquals } from "@std/assert";
 *
 * const div = ce("div", { id: "id" }, ce("span", { class: "class" }, "hello"));
 * const span = qs("div#id > span.class", div);
 * assertEquals(span?.textContent, "hello");
 * ```
 *
 * @module query
 */

export { ce } from "./create.ts";
export { qa, qs } from "./select.ts";
