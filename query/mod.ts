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
  assign: Partial<Writable<HTMLElementTagNameMap[A]>> & { parent?: Node } = {},
): HTMLElementTagNameMap[A] => {
  const a = document.createElement(tag);
  if (assign) {
    const { parent, ...b } = assign, c = Object.keys(b);
    parent?.appendChild(a); // @ts-expect-error: it'll be ok
    for (const key of Object.keys(b)) if (b[key] !== undefined) a[key] = b[key];
  }
  return a;
};
