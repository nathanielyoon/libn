/**
 * Wrapper for `document.createElement`.
 *
 * @example Usage
 * ```ts
 * // only necessary in non-browser environments
 * import { Document, Element } from "@b-fuze/deno-dom";
 * globalThis.document = new Document() as any;
 * globalThis.Element = Element as any;
 *
 * import { assertEquals } from "@std/assert";
 *
 * const div = ce("div", { id: "i" }, ce("span", { class: "c" }, "text"));
 * assertEquals(div.outerHTML, '<div id="i"><span class="c">text</span></div>');
 * ```
 *
 * @module create
 */

/** @internal */
type Attributes<A> =
  & {
    [B in keyof HTMLElementEventMap as `on${B}`]?: (
      this: A,
      event: HTMLElementEventMap[B] & { currentTarget: A },
    ) => any;
  }
  & { [_: string]: any };
/** @internal */
type Child = null | undefined | string | Element;
/** @internal */
type Children<A = any> =
  (Child | Child[] | ((parent: A) => Child | Child[] | void))[];
/** Creates an HTML element. */
export const ce = (
  (tag: string, attributes?: { [_: string]: any }, ...children: Children) => {
    const element = globalThis.document.createElement(tag);
    for (const [key, value] of Object.entries(attributes ?? {})) {
      if (typeof value === "function" && key.startsWith("on")) {
        element.addEventListener(key.slice(2), value); // deno-lint-ignore eqeqeq
      } else if (value != null) element.setAttribute(key, value);
    }
    for (const child of children) {
      const nodes = typeof child === "function" ? child(element) : child;
      for (const add of Array.isArray(nodes) ? nodes : [nodes]) {
        add && element.appendChild(
          add instanceof globalThis.Element
            ? add
            : globalThis.document.createTextNode(add),
        );
      }
    }
    return element;
  }
) as {
  <A extends keyof HTMLElementTagNameMap>(
    tag: A,
    attributes?: Attributes<HTMLElementTagNameMap[A]>,
    ...children: Children<HTMLElementTagNameMap[A]>
  ): HTMLElementTagNameMap[A];
  (
    tag: string,
    attributes?: Attributes<HTMLUnknownElement>,
    ...children: Children<HTMLUnknownElement>
  ): HTMLUnknownElement;
};
