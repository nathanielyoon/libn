/**
 * Short [querySelector](https://dev.mozilla.org/Web/API/Element/querySelector),
 * [querySelectorAll](https://dev.mozilla.org/Web/API/Element/querySelectorAll),
 * and [createElement](https://dev.mozilla.org/Web/API/Document/createElement).
 *
 * @example Query document
 * ```ts
 * import { DOMParser } from "@b-fuze/deno-dom/native";
 * import { assertEquals } from "@std/assert";
 *
 * globalThis.document = new DOMParser().parseFromString(
 *   '<a id="c"><b class="e">0</b><b>1</b></a><a id="d"><b>2</b></a>',
 *   "text/html",
 * ) as any;
 * assertEquals(qs("a#d")?.textContent, "2");
 * assertEquals(qa("b:not([class])").length, 2);
 * assertEquals(qs("b", ce("a", ce("b", "bold"), "not"))?.textContent, "bold");
 * ```
 *
 * @module query
 */

/** @internal */
type Html = HTMLElementTagNameMap;
/** @internal */
type Trim<A extends string> = A extends
  `${any}${" " | ">" | "~" | "+" | "||"}${infer B}` ? Trim<B>
  : A extends `${infer B}${"#" | "." | "[" | ":"}${any}` ? Trim<B>
  : A extends keyof Html ? Html[A]
  : Element;
/** Query-selects an element. */
export const qs =
  (($: string, parent = document.body) => parent.querySelector($)) as {
    <A extends keyof Html>(tag: A, parent?: Element): Html[A] | null;
    <A extends string>(selector: A, parent?: Element): Trim<A> | null;
    <A extends Element>(selector: string, parent?: Element): A | null;
  };
/** Query-selects all elements. */
export const qa =
  (($: string, parent = document.body) => [...parent.querySelectorAll($)]) as {
    <A extends keyof Html>(tag: A, parent?: Element): Html[A][];
    <A extends string>(selector: A, parent?: Element): Trim<A>[];
    <A extends Element>(selector: string, parent?: Element): A[];
  };
/** Child node. */
export type Child = null | undefined | string | Element;
/** Creates an element with optional children. */
export const ce = <A extends keyof Html>(
  tag: A,
  ...actions: (Child | Child[] | (($: Html[A]) => void | Child | Child[]))[]
): Html[A] =>
  actions.reduce<Html[A]>((element, action) => {
    const children = typeof action === "function" ? action(element) : action;
    for (const child of Array.isArray(children) ? children : [children]) {
      child && element.appendChild(
        typeof child === "string" ? document.createTextNode(child) : child,
      );
    }
    return element;
  }, document.createElement(tag));
