type Nullish<A> = A | null | undefined | void;
type Children = Nullish<string | Node | Nullish<string | Node>[]>;
type Writable<A, B> = (<C>() => C extends A ? true : false) extends
  (<C>() => C extends Readonly<A> ? true : false) ? never : B;
type Off<A, B extends keyof A> = B extends `on${string}` ? never
  : A extends (...args: any[]) => any ? never
  : Writable<Pick<A, B>, B>;
type Builder<A> =
  & { [B in keyof A as Off<A, B>]: ($: A[B]) => Builder<A> }
  & {
    [B in Extract<keyof A, `on${string}`>]: NonNullable<A[B]> extends
      (event: infer C) => any
      ? ($: (event: C & { currentTarget: A }) => any) => Builder<A>
      : never;
  }
  & ((...use: (((element: A) => void | Children) | Children)[]) => A);
const builder = (target: any) => ({
  get: (_, key: string, proxy) => (value: any) => (target[key] = value, proxy),
  apply: (append, _, all) => {
    for (const $ of all) {
      $ && append(target, typeof $ === "function" ? $(target) : $);
    }
    return target;
  },
} satisfies ProxyHandler<(parent: Node, $: Children) => Node>);
const handler = {
  get: (create, tag: string) =>
    new Proxy((parent: Node, $: Children) => {
      for (const child of (Array.isArray($) ? $ : [$])) {
        child && parent.appendChild(
          typeof child === "string" ? document.createTextNode(child) : child,
        );
      }
      return parent;
    }, builder(create(tag))),
  apply: (create, _, [tag, parent, assign]: [string, (Node | null)?, any?]) =>
    Object.assign(parent?.appendChild(create(tag)) ?? create(tag), assign),
} satisfies ProxyHandler<(tag: string) => Element>;
/** @internal */
type Elementer<A> =
  & { [B in keyof A]: Builder<A[B]> }
  & (<B extends keyof A>(
    tag: B,
    parent?: Node | null,
    assign?: { [C in keyof A[B] as Writable<Pick<A[B], C>, C>]?: A[B][C] },
  ) => A[B]);
/** Creates an HTML element when called directly, otherwise wraps a builder. */
export const html: Elementer<HTMLElementTagNameMap> = new Proxy<any>(
  document.createElement.bind(document),
  handler,
);
/** Creates an SVG element when called directly, otherwise wraps a builder. */
export const svg: Elementer<SVGElementTagNameMap> = new Proxy<any>(
  document.createElementNS.bind(document, "http://www.w3.org/2000/svg"),
  handler,
);
