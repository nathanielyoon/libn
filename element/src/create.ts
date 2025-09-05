type Nullish<A> = A | null | undefined;
type Children = Nullish<string | Node | Nullish<string | Node>[]>;
const node = ($: string | Node) =>
  typeof $ === "string" ? document.createTextNode($) : $;
const append = (parent: Node, $: Children) =>
  (Array.isArray($) ? $ : [$]).forEach(($) => $ && parent.appendChild(node($)));
type Writable<A, B> = (<C>() => C extends A ? true : false) extends
  (<C>() => C extends Readonly<A> ? true : false) ? never : B;
type Off<A, B extends keyof A> = B extends `on${string}` ? never
  : A extends (...args: any[]) => any ? never
  : Writable<Pick<A, B>, B>;
type Elementer<A> =
  & { [B in keyof A as Off<A, B>]: ($: A[B]) => Elementer<A> }
  & {
    [B in Extract<keyof A, `on${string}`>]: NonNullable<A[B]> extends
      (event: infer C) => any
      ? ($: (event: C & { currentTarget: A }) => any) => Elementer<A>
      : never;
  }
  & ((use?: ((element: A) => Children) | Children) => A);
const elementer = (target: any) => ({
  get: (_, key: string, proxy) => (value: any) => (target[key] = value, proxy),
  apply: (_, __, [$]) => (
    $ && append(target, typeof $ === "function" ? $(target) : $), target
  ),
} satisfies ProxyHandler<() => void>);
const builder = {
  get: (create, tag: string) => new Proxy(() => {}, elementer(create(tag))),
  apply: (create, _, [tag, parent, assign]: [string, (Node | null)?, any?]) =>
    Object.assign(parent?.appendChild(create(tag)) ?? create(tag), assign),
} satisfies ProxyHandler<(tag: string) => Element>;
type Builder<A> =
  & { [B in keyof A]: Elementer<A[B]> }
  & (<B extends keyof A>(
    tag: B,
    parent?: Node | null,
    assign?: { [C in keyof A[B] as Writable<Pick<A[B], C>, C>]?: A[B][C] },
  ) => A[B]);
export const html: Builder<HTMLElementTagNameMap> = new Proxy<any>(
  document.createElement.bind(document),
  builder,
);
export const svg: Builder<SVGElementTagNameMap> = new Proxy<any>(
  document.createElementNS.bind(document, "http://www.w3.org/2000/svg"),
  builder,
);
