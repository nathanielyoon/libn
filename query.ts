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
/** Creates an element, optionally setting attributes. */
export const ce = <A extends Tag>(
  tag: A,
  parent?: Element,
  set?: { [B in keyof HTMLElementTagNameMap[A]]?: HTMLElementTagNameMap[A][B] },
): HTMLElementTagNameMap[A] => {
  const a = document.createElement(tag);
  if (set) {
    const b = Object.keys(set) as (keyof typeof set)[];
    for (let z = 0; z < b.length; ++z) {
      const c = set[b[z]];
      if (c !== undefined) set[b[z]] = c;
    }
  }
  return parent?.appendChild(a) ?? a;
};
type On<A extends HTMLElement> =
  & {
    [B in keyof HTMLElementEventMap]: (
      listener: (
        this: A,
        event: HTMLElementEventMap[B] & { currentTarget: A },
      ) => any,
    ) => On<A>;
  }
  & { (): A };
/** Wraps an element to attach event listeners. */
export const on = <A extends HTMLElement>($: A): On<A> =>
  new Proxy($, {
    get: (target, name: keyof HTMLElementEventMap, receiver) =>
    (
      listener: EventListener,
      options?: boolean | AddEventListenerOptions,
    ) => (target.addEventListener(name, listener, options), receiver),
    apply: (target) => target,
  }) as any;
