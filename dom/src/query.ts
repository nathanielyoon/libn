/** @internal */
type Tag = keyof HTMLElementTagNameMap;
/** @internal */
type Trim<A extends string> = A extends
  `${any}${" " | ">" | "~" | "+" | "||"}${infer B}` ? Trim<B>
  : A extends `${infer B}${"#" | "." | "[" | ":"}${any}` ? Trim<B>
  : A extends Tag ? HTMLElementTagNameMap[A]
  : Element;
/** Query-selects an element. */
export const qs =
  (($: string, parent = document.body) => parent.querySelector($)) as {
    <A extends Tag>(tag: A, parent?: Element): HTMLElementTagNameMap[A] | null;
    <A extends string>(selector: A, parent?: Element): Trim<A> | null;
    <A extends Element>(selector: string, parent?: Element): A | null;
  };
/** Query-selects all elements. */
export const qa =
  (($: string, parent = document.body) => [...parent.querySelectorAll($)]) as {
    <A extends Tag>(tag: A, parent?: Element): HTMLElementTagNameMap[A][];
    <A extends string>(selector: A, parent?: Element): Trim<A>[];
    <A extends Element>(selector: string, parent?: Element): A[];
  };
