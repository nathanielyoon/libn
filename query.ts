type Lo<A, B extends string> = A extends `${any}${B}${infer D}` ? Lo<D, B> : A;
type Hi<A, B extends string> = A extends `${infer C}${B}${any}` ? Hi<C, B> : A;
type Tag = keyof HTMLElementTagNameMap;
type As<A extends string> = A extends Tag ? HTMLElementTagNameMap[A] : Element;
/** Query-selects an element. */
export const qs = ((selector: string, parent = document.body) => {
  const element = parent.querySelector(selector);
  if (element) return element;
  throw Error("UNREACHABLE");
}) as {
  <A extends Tag>(selector: A, parent?: Element): HTMLElementTagNameMap[A];
  <A extends string>(
    selector: A,
    parent?: Element,
  ): As<Hi<Lo<A, " " | ">">, "." | "#" | "[" | ":">>;
  <A extends Element>(selector: string, parent?: Element): A;
};
/** Query-selects all elements. */
export const qa = ((selector: string, parent = document.body) => [
  ...parent.querySelectorAll(selector),
]) as {
  <A extends Tag>(selector: A, parent?: Element): HTMLElementTagNameMap[A][];
  <A extends string>(
    selector: A,
    parent?: Element,
  ): As<Hi<Lo<A, " " | ">">, "." | "#" | "[" | ":">>[];
  <A extends Element>(selector: string, parent?: Element): A[];
};
