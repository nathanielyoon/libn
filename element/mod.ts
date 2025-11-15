/** @module */
/** @internal */
type Props<A> = {
  style?: {
    [
      B in Extract<
        keyof CSSStyleDeclaration,
        string
      > as CSSStyleDeclaration[B] extends string ? B : never
    ]?: string;
  };
  on?: {
    [B in keyof HTMLElementEventMap]?: (
      this: A,
      event: HTMLElementEventMap[B] & { currentTarget: A },
    ) => any;
  };
  [_: string]: any;
};
type Child =
  | (undefined | null | string | Element)
  | (undefined | null | string | Element)[];
/** @internal */
type Childs<A extends Element> = (Child | ((parent: A) => void | Child))[];
/** Creates an element. */
export const h = ((tag: string, props?: Props<any>, ...childs: Childs<any>) => {
  const out = globalThis.document.createElement(tag);
  const { style, on, ...attributes } = props ?? {};
  for (const $ of Object.entries(style ?? {})) {
    out.style[$[0] as keyof typeof style] = $[1];
  }
  for (const $ of Object.entries(on ?? {})) {
    out.addEventListener($[0], $[1] as EventListener);
  }
  for (const $ of Object.entries(attributes)) { // deno-lint-ignore eqeqeq
    $[1] != null && out.setAttribute($[0], $[1]);
  }
  for (const $ of childs) {
    for (const child of [typeof $ === "function" ? $(out) : $].flat()) {
      child && out.append(child);
    }
  }
  return out;
}) as {
  <A extends keyof HTMLElementTagNameMap>(
    tag: A,
    props?: Props<HTMLElementTagNameMap[A]>,
    ...childs: Childs<HTMLElementTagNameMap[A]>
  ): HTMLElementTagNameMap[A];
  (
    tag: string,
    props?: Props<HTMLUnknownElement>,
    ...childs: Childs<HTMLUnknownElement>
  ): HTMLUnknownElement;
};
