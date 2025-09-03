type Not<A, B> = (<C>() => C extends A ? true : false) extends
  (<C>() => C extends Readonly<A> ? true : false) ? never : B;
type Child = undefined | null | string | Node;
type Html<A extends HTMLElement> =
  & {
    [B in keyof A as Not<Pick<A, B>, B>]: (
      $: [B, NonNullable<A[B]>] extends
        [`on${string}`, (event: infer C extends Event) => any]
        ? ($: C & { currentTarget: A }) => any
        : A[B],
    ) => Html<A>;
  }
  & { (children?: Child[]): A };
const get = (effect: ($: () => void) => () => void, tag: string) =>
  new Proxy<any>(document.createElement(tag), {
    get: (target, key: string, proxy) => (value: any) => {
      if (value !== undefined) {
        typeof value !== "function" || key.startsWith("on")
          ? target[key] = value
          : effect(() => target[key] = value);
      }
      return proxy;
    },
    apply: (target, _, [children]: [Child[]?]) => {
      for (const node of children ?? []) {
        node && target.appendChild(
          typeof node === "string" ? new Text(node) : node,
        );
      }
      return target;
    },
  });
/** Creates an HTML builder. */
export const runtime = (effect: ($: () => void) => () => void): {
  [A in keyof HTMLElementTagNameMap]: Html<HTMLElementTagNameMap[A]>;
} => new Proxy<any>(effect, { get });
