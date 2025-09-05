type Not<A, B> = (<C>() => C extends A ? true : false) extends
  (<C>() => C extends Readonly<A> ? true : false) ? never : B;
type Child = undefined | null | string | Node;
type Htmler<A extends HTMLElement> =
  & {
    [B in keyof A as Not<Pick<A, B>, B>]: (
      $: [B, NonNullable<A[B]>] extends
        [`on${string}`, (event: infer C extends Event) => any]
        ? ($: C & { currentTarget: A }) => any
        : A[B] | (() => A[B]),
    ) => Htmler<A>;
  }
  & { (children?: Child[] | (() => Child[])): A };
const node = ($: NonNullable<Child>) => typeof $ === "string" ? new Text($) : $;
const html = (target: any) => ({
  get: (effect, key: string, proxy) => (value: any) => {
    if (value !== undefined) {
      typeof value !== "function" || key.startsWith("on")
        ? target[key] = value
        : effect(() => target[key] = value());
    }
    return proxy;
  },
  apply: (effect, _, [children]: [(Child[] | (() => Child[]))?]) => (
    typeof children === "function"
      ? effect(() =>
        Element.prototype.replaceChildren.apply(
          target,
          children().reduce<Node[]>((to, $) => $ ? [...to, node($)] : to, []),
        )
      )
      : children?.forEach(($) => $ && target.appendChild(node($))), target
  ),
} satisfies ProxyHandler<($: () => void) => () => void>);
/** Creates an HTML builder. */
export const reactive = (effect: ($: () => void) => () => void): {
  [A in keyof HTMLElementTagNameMap]: Htmler<HTMLElementTagNameMap[A]>;
} =>
  new Proxy<any>({}, {
    get: (_, $: string) => new Proxy(effect, html(document.createElement($))),
  });
/** Creates an element. */
export const ce = <A extends keyof HTMLElementTagNameMap>(
  $: A,
  parent?: Node,
): HTMLElementTagNameMap[A] =>
  parent?.appendChild(document.createElement($)) ?? document.createElement($);
