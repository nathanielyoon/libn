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
 * ```
 *
 * @module dom
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
/** @internal */
type Use<A> = Child | Child[] | (($: A) => void | Child | Child[]);
/** @internal */
type Name<A, B> = (<C>() => C extends A ? true : false) extends
  (<C>() => C extends Readonly<A> ? true : false) ? never : B;
/** @internal */
type Value<A, B> = B extends (event: infer C extends Event) => any
  ? (event: C & { currentTarget: A }) => any
  : B;
/** @internal */
type Attributes<A> = { [B in keyof A as Name<Pick<A, B>, B>]?: Value<A, A[B]> };
const append = <A extends HTMLElement>($: A, use: Use<A>) => {
  const children = typeof use === "function" ? use($) : use;
  for (const child of Array.isArray(children) ? children : [children]) {
    child && $.appendChild(
      typeof child === "string" ? document.createTextNode(child) : child,
    );
  }
  return $;
};
/** Element builder. */
export const html = <A extends keyof Html>(
  tag: A,
  assign?: Attributes<Html[A]>,
): (...$: Use<Html[A]>[]) => Html[A] =>
(...$) => $.reduce(append, Object.assign(document.createElement(tag), assign));
