type Not<A, B> = (<C>() => C extends A ? true : false) extends
  (<C>() => C extends Readonly<A> ? true : false) ? never : B;
type Attributes<A> = {
  [B in keyof A as Not<Pick<A, B>, B>]?: [B, NonNullable<A[B]>] extends
    [`on${string}`, (event: infer C extends Event) => any]
    ? ($: C & { currentTarget: A }) => any
    : A[B];
};
type Child = undefined | null | string | Node;
const get: ProxyHandler<($: () => void) => () => void>["get"] =
  (effect, tag: string) => ($?: {}, children?: Child[]) => {
    const a = document.createElement(tag);
    for (const [key, value] of Object.entries($ ?? {})) {
      if (value !== undefined) {
        const b = typeof value !== "function" || key.startsWith("on"); // @ts-expect-error
        b ? a[key] = value : effect(() => a[key] = value);
      }
    }
    for (const node of children ?? []) {
      node && a.appendChild(typeof node === "string" ? new Text(node) : node);
    }
    return a;
  };
/** Creates an HTML builder. */
export const htmler = (effect: ($: () => void) => () => void): {
  [A in keyof HTMLElementTagNameMap]: HTMLElementTagNameMap[A] extends infer B
    ? B extends HTMLElement ? ($?: Attributes<B>, children?: Child[]) => B
    : never
    : never;
} => new Proxy<any>(effect, { get });
