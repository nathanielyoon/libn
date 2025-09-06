/**
 * DOM element utilities.
 *
 * @example Query the document
 * ```ts
 * import { DOMParser } from "@b-fuze/deno-dom/native";
 * import { assertEquals } from "@std/assert";
 *
 * globalThis.document = new DOMParser().parseFromString(
 *   "<div>hello</div>",
 *   "text/html",
 * ) as any;
 * import("@libn/element").then(({ qs }) =>
 *   assertEquals(qs("div")?.textContent, "hello")
 * );
 * ```
 */

export { escape } from "./src/escape.ts";
export { qa, qs } from "./src/query.ts";
export { html, svg } from "./src/create.ts";
