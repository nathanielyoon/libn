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
 * @module query
 */

/** Element tag name. */
export type Tag = keyof HTMLElementTagNameMap;
type Trim<A extends string> = A extends `${any}${" " | ">"}${infer B}` ? Trim<B>
  : A extends `${infer B}${"#" | "." | "[" | ":"}${any}` ? Trim<B>
  : A;
type As<A extends string> = A extends Tag ? HTMLElementTagNameMap[A] : Element;
/** Query-selects an element. */
export const qs =
  ((query: string, parent = document.body) => parent.querySelector(query)) as {
    <A extends Tag>(tag: A, parent?: Element): HTMLElementTagNameMap[A] | null;
    <A extends string>(selector: A, parent?: Element): As<Trim<A>> | null;
    <A extends Element>(selector: string, parent?: Element): A | null;
  };
/** Query-selects all elements. */
export const qa = ((query: string, parent = document.body) => [
  ...parent.querySelectorAll(query),
]) as {
  <A extends Tag>(tag: A, parent?: Element): HTMLElementTagNameMap[A][];
  <A extends string>(selector: A, parent?: Element): As<Trim<A>>[];
  <A extends Element>(selector: string, parent?: Element): A[];
};
type Writable<A> = Pick<
  A,
  keyof {
    [B in keyof A]: (<C>() => C extends { [_ in B]: A[B] } ? 1 : 0) extends
      (<C>() => C extends { -readonly [_ in B]: A[B] } ? 1 : 0) ? B : never;
  }
>;
/** Creates an element. */
export const ce = <A extends Tag>(
  tag: A,
  parent?: Node,
  set: Partial<Writable<HTMLElementTagNameMap[A]>> = {},
): HTMLElementTagNameMap[A] => {
  const a = document.createElement(tag);
  if (set) {
    parent?.appendChild(a); // @ts-expect-error: it'll be ok
    for (const $ of Object.keys(set)) if (set[$] !== undefined) a[$] = set[$];
  }
  return a;
};
