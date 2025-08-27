type Trim<A extends string> = A extends `${any}${" " | ">"}${infer B}` ? Trim<B>
  : A extends `${infer B}${"#" | "." | "[" | ":"}${any}` ? Trim<B>
  : A;
type Tag = keyof HTMLElementTagNameMap;
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
/** Creates an element. */
export const ce = <A extends Tag>(
  as: A,
  parent?: Node,
): HTMLElementTagNameMap[A] =>
  parent?.appendChild(document.createElement(as)) ?? document.createElement(as);
