import { Err } from "@libn/result";

/** @internal */
type Html = HTMLElementTagNameMap;
/** @internal */
type Child = null | undefined | string | Element;
const CSS_IDENTIFIER =
  /(?:[A-Za-z_\u00a0-\uffff]|-(?!\d)|\\[^\dA-Fa-f])(?:[-\w\u00a0-\uffff]|\\(?:\\[^\dA-Fa-f]))*/;
const ATTRIBUTES = /\[[^\s\0-\x1f\x7f"'/=>]+="(?:\\"|[^"])*"\]/g;
/** Creates an element. */
export const html = <A extends keyof Html>(
  element: `${A}${`#${string}` | ""}${`.${string}` | ""}${`[${string}` | ""}`,
  ...children: (
    | Child
    | Child[]
    | (($: Html[A]) => void | Child | Child[])
    | {
      [B in keyof HTMLElementEventMap]?: (
        this: Html[A],
        event: HTMLElementEventMap[B] & { currentTarget: Html[A] },
      ) => any;
    }
  )[]
): Html[A] => {
  const exec = RegExp(
    `^(${CSS_IDENTIFIER.source})(?:#(${CSS_IDENTIFIER.source}))?((?:\\.${CSS_IDENTIFIER.source})*)((?:${ATTRIBUTES.source})*)$`,
  ).exec(element);
  if (!exec) throw new Err("invalid selector", element);
  const parent = document.createElement(exec[1]) as Html[A];
  if (exec[2]) parent.id = exec[2];
  parent.classList.add.apply(
    parent.classList,
    exec[3].match(RegExp(`(?<=\\.)${CSS_IDENTIFIER.source}`, "g")) ?? [],
  );
  for (let all = exec[4].match(ATTRIBUTES) ?? [], z = 0; z < all.length; ++z) {
    const selector = all[z], mid = selector.indexOf("=");
    parent.setAttribute(
      selector.slice(1, mid),
      selector.slice(mid + 2, -2).replace(/(?<=(?:^|[^\\])(?:\\\\)*)\\"/g, '"'),
    );
  }
  for (let z = 0; z < children.length; ++z) {
    const use = children[z], to = typeof use === "function" ? use(parent) : use;
    for (let all = Array.isArray(to) ? to : [to], y = 0; y < all.length; ++y) {
      const child = all[y];
      if (child) {
        if (child instanceof globalThis.Element) parent.appendChild(child);
        else if (typeof child === "object") {
          for (let all = Object.entries(child), x = 0; x < all.length; ++x) {
            parent.addEventListener(all[x][0], all[x][1] as EventListener);
          }
        } else parent.appendChild(document.createTextNode(child));
      }
    }
  }
  return parent;
};
