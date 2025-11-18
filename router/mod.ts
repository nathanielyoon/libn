/** HTTP methods. */
export type Method =
  | ("GET" | "HEAD" | "CONNECT" | "TRACE") // has no body
  | ("POST" | "PUT" | "DELETE" | "OPTIONS" | "PATCH"); // (maybe) has body
type Parameters<A extends string, B extends string> = A extends `?${infer C}`
  ? C extends "" | `/${string}` ? { [_ in B]: string } & { "": string[] }
  : C extends `${infer D}/${infer E}`
    ? D extends B ? never : Parameters<E, B | D>
  : { [_ in B | C]: string }
  : A extends `${string}/${infer D}` ? Parameters<D, B>
  : { [_ in B]: string };
type From<A extends Method, B extends string> = {
  url: URL;
  path: Parameters<B, never>;
  request:
    & { method: A; clone: () => From<A, B>["request"] }
    & Omit<
      Request,
      | ("method" | "clone")
      | (A extends "GET" | "HEAD" | "CONNECT" | "TRACE" ?
          | ("body" | "bodyUsed")
          | ("arrayBuffer" | "blob" | "bytes" | "formData" | "json" | "text")
        : never)
    >;
};
type Into = null | number | string | BufferSource | Blob | Response;
/** @internal */
type Handler<A extends unknown[], B extends Method, C extends string> = (
  from: From<B, C>,
  ..._: A
) => Into | Promise<Into>;
class Node<A extends unknown[]> {
  children: { [_: string]: Node<A> } = {};
  one?: { name: string; node: Node<A> };
  all?: Node<A>;
  handlers: { [C in Method]?: Handler<A, C, string> } = {};
}
const split = ($: string) => $.match(/(?<=\/)(?!$)[^/]*/g) ?? [];
const wrap = ($: unknown) =>
  $ instanceof Error
    ? { name: $.name, message: $.message, cause: $.cause, stack: $.stack }
    : { name: "", message: `${$}`, cause: $ };
const fail = ($: unknown) =>
  new Response(JSON.stringify($), {
    status: 500,
    headers: { "content-type": "application/json" },
  });
/** HTTP router base class. */
export class Router<A extends unknown[] = []> {
  private routes: { method: Method; path: string[]; handler: any }[] = [];
  private tree: Node<A> | null = null;
  private catcher: (
    error: unknown,
    from: From<Method, string>,
    ...context: A
  ) => Response | Promise<Response> = ($, ..._) =>
    Response.json(wrap($), { status: 500 });
  /** Adds a route handler. */
  if<B extends Method, C extends string>(
    method: B,
    path: `/${C}`,
    handler: Handler<A, B, C>,
  ): this {
    this.routes.push({ method, path: split(path), handler }), this.tree = null;
    return this;
  }
  /** Adds an application-wide error handler. */
  else(catcher: typeof this.catcher): this {
    return this.catcher = catcher, this;
  }
  /** Builds and saves the routing tree. */
  private get router(): Node<A> {
    if (this.tree) return this.tree;
    const to = new Node();
    for (let z = 0, y; z < this.routes.length; ++z) {
      let prev = to, next = this.routes[z];
      for (const $ of next.path) {
        if ($ === "?") {
          prev = prev.all = new Node();
          break;
        } else if ($.startsWith("?")) {
          prev.one = { name: $.slice(1), node: prev = new Node() };
        } else prev = prev.children[$] ??= new Node();
      }
      prev.handlers[next.method] = next.handler;
    }
    return this.tree = to;
  }
  /** Handles an incoming request. */
  async fetch(request: Request, ...context: A): Promise<Response> {
    try {
      const from = {
        url: new URL(request.url),
        path: {} as { [_: string]: string } & { "": string[] },
        request: request as never,
      };
      let node = this.router;
      for (let to = split(from.url.pathname), on, z = 0; z < to.length; ++z) {
        if (node.children[on = to[z]]) node = node.children[on];
        else if (node.one) from.path[node.one.name] = on, node = node.one.node;
        else if (node.all) {
          from.path[""] = to.slice(z), node = node.all;
          break;
        } else return new Response(null, { status: 404 });
      }
      const handler = node.handlers[request.method as Method];
      if (!handler) return new Response(null, { status: 405 });
      try {
        const out = await handler(from, ...context);
        if (out instanceof Response) return out;
        if (typeof out === "number") return new Response(null, { status: out });
        if (typeof out === "string" || !out) return new Response(out);
        if (out instanceof Blob) return new Response(out);
        return new Response(out, {
          headers: { "content-type": "application/octet-stream" },
        });
      } catch (first) {
        return await this.catcher(first, from, ...context);
      }
    } catch (second) {
      return Response.json(wrap(second), { status: 500 });
    }
  }
}
