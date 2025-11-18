class Node<A> {
  on: { [_: string]: A | undefined } = {};
  sub: { [_: string]: Node<A> } = {};
  part?: { name: string; node: Node<A> };
  rest?: Node<A>;
}
type Part<A extends string> = A extends `?${infer B}` ? B : never;
type Path<A extends string, B extends string> = A extends
  `${infer C}/${infer D}` ? C extends "?" ? B | "" : Path<D, B | Part<C>>
  : B | Part<A>;
interface Source<A extends string> {
  url: URL;
  path: { [B in Path<A, never>]: B extends "" ? string[] : string };
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
  private fixed: { [_: string]: To<A, string> | undefined } = {};
  private routes: Node<To<A, string>> = new Node();
  /** Adds a route. */
  route<B extends string>(method: string, path: `/${B}`, to: To<A, B>): this {
    let fixed = true, node = this.routes;
    for (const part of split(path)) {
      if (part === "?") {
        fixed = false, node = node.rest ??= new Node();
        break;
      } else if (part.startsWith("?")) {
        fixed = false;
        if (part.slice(1) === node.part?.name) node = node.part.node;
        else node.part = { name: part.slice(1), node: node = new Node() };
      } else node = node.sub[encodeURIComponent(part)] ??= new Node();
    }
    if (fixed) this.fixed[`${method} ${path}`] = to;
    return node.on[method] = to, this;
  }
  /** Handles a request. */
  async fetch(request: Request, ...context: A): Promise<Response> {
    const url = new URL(request.url), path: { [_: string]: unknown } = {};
    let to = this.fixed[`${request.method} ${url.pathname}`];
    if (!to) {
      let node = this.routes;
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
