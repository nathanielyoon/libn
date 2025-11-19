class Node<A> {
  on: { [_: string]: A | undefined } = {};
  sub: { [_: string]: Node<A> } = Object.create(null);
  part?: { name: string; node: Node<A> };
  rest?: Node<A>;
}
type Part<A extends string> = A extends `?${infer B}` ? B : never;
type Path<A extends string, B extends string> = A extends
  `${infer C}/${infer D}` ? C extends "?" ? B | "" : Path<D, B | Part<C>>
  : B | Part<A>;
/** Request conteext. */
export interface Source<A extends string> {
  /** Parsed URL. */
  url: URL;
  /** Path parameters, including an anonymous rest parameter if present. */
  path: { [B in Path<A, never>]: B extends "" ? string[] : string };
  /** Original request. */
  request: Request;
}
/** @internal */
type To<A extends unknown[], B extends string> = (
  this: Router<A>,
  source: Source<B>,
  ...context: A
) => number | BodyInit | Response | Promise<number | BodyInit | Response>;
const split = ($: string) => $.match(/(?<=\/)\??[^/?]*/g) ?? [];
/** Simple tree router. */
export class Router<A extends unknown[] = []> {
  private map: { [_: string]: To<A, string> | undefined } = {};
  private tree: Node<To<A, string>> = new Node();
  /** Adds a route. */
  route<B extends string>(method: string, path: `/${B}`, to: To<A, B>): this {
    if (/\/\?/.test(path)) {
      let node = this.tree;
      for (const part of split(path)) {
        if (part === "?") {
          node = node.rest ??= new Node();
          break;
        } else if (part.startsWith("?")) {
          if (part.slice(1) === node.part?.name) node = node.part.node;
          else node.part = { name: part.slice(1), node: node = new Node() };
        } else node = node.sub[decodeURIComponent(part)] ??= new Node();
      }
      node.on[method] = to;
    } else this.map[method + new URL(path, "http://localhost").pathname] = to;
    return this;
  }
  /** Handles a request. */
  async fetch(request: Request, ...context: A): Promise<Response> {
    const url = new URL(request.url), path: { [_: string]: unknown } = {};
    let to = this.map[request.method + url.pathname];
    if (!to) {
      let node = this.tree;
      for (let all = split(url.pathname), part, z = 0; z < all.length; ++z) {
        if (node.sub[part = decodeURIComponent(all[z])]) node = node.sub[part];
        else if (node.part) path[node.part.name] = part, node = node.part.node;
        else if (node.rest) {
          path[""] = all.slice(z), node = node.rest;
          break;
        } else return new Response(null, { status: 404 });
      }
      to = node.on[request.method];
      if (!to) return new Response(null, { status: 405 });
    }
    try {
      const out = await to.call(this, { url, path, request }, ...context);
      if (out instanceof Response) return out;
      if (typeof out === "number") return new Response(null, { status: out });
      return new Response(out);
    } catch ($) {
      return Response.json(
        $ instanceof Error
          ? { name: $.name, message: $.message, cause: $.cause, stack: $.stack }
          : { name: "", message: `${$}`, cause: $ },
        { status: 500 },
      );
    }
  }
}
