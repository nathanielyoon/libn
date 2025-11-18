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
type Into = string | { [_: string]: unknown } | BufferSource | Blob | Response;
/** @internal */
type Handler<A, B extends Method, C extends string> = B extends B
  ? (this: A, from: From<B, C>) => Into | Promise<Into>
  : never;
class Node<A> {
  children: { [_: string]: Node<A> } = {};
  one?: { name: string; node: Node<A> };
  all?: Node<A>;
  handlers: { [C in Method]?: Handler<A, C, string> } = {};
}
const split = ($: string) => $.match(/\/(?!$)[^/]*/g) ?? [];
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
export class Router<A = never> {
  private routes: { method: Method; path: string[]; handler: any }[] = [];
  private tree: Node<A> | null = null;
  private catcher: (
    this: A,
    error: unknown,
    from: From<Method, string>,
  ) => Response | Promise<Response> = ($) => fail(wrap($));
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
    for (let prev, next, use, z = 0, y; z < this.routes.length; ++z) {
      for (prev = to, next = this.routes[z], y = 0; y < next.path.length; ++y) {
        if (use = /^\/\?(.*)$/.exec(next.path[y])) {
          if (use[1]) prev.one = { name: use[1], node: prev = new Node() };
          else {
            prev = prev.all = new Node();
            break;
          }
        } else prev = prev.children[next.path[y]] ??= new Node();
      }
      prev.handlers[next.method] = next.handler;
    }
    return this.tree = to;
  }
  /** Handles an incoming request. */
  async fetch(request: Request, context: A): Promise<Response> {
    const from = {
      url: new URL(request.url),
      path: {} as { [_: string]: string } & { "": string[] },
      request: request as any,
    };
    let node = this.router;
    for (let path = split(from.url.pathname), on, z = 0; z < path.length; ++z) {
      if (node.children[on = path[z]]) node = node.children[on];
      else if (node.one) from.path[node.one.name] = on, node = node.one.node;
      else if (node.all) {
        from.path[""] = path.slice(z), node = node.all;
        break;
      } else return new Response(null, { status: 404 });
    }
    const handler = node.handlers[request.method as Method];
    if (!handler) return new Response(null, { status: 405 });
    let into, type;
    try {
      into = await handler.call(context, from);
    } catch (first) {
      try {
        into = await this.catcher.call(context, first, from);
      } catch (second) { // uh oh!
        into = fail([wrap(first), wrap(second)]);
      }
    }
    if (into instanceof Response) return into;
    if (into instanceof Blob) type = into.type;
    else if (ArrayBuffer.isView(into) || into instanceof ArrayBuffer) {
      type = "application/octet-stream";
    } else if (typeof into === "object") {
      into = JSON.stringify(into), type = "application/json";
    } else type = "text/plain";
    return new Response(into, { headers: { "content-type": type } });
  }
}
