import type { Result } from "@libn/result";

const PATH =
  /^(?:\/(?:[A-Za-z\d-_~!$&'()*+,;=:@]|%[\dA-Fa-f]{2})+|\/#(?!__proto__)[^/#]+)+$|^\/$/;
type Name<A extends string> = A extends `#${infer B}` ? B : never;
type Path<A extends string, B extends string> = A extends
  `${infer C}/${infer D}` ? Path<D, B | Name<C>> : B | Name<A>;
interface On<A extends string = string> {
  url: URL;
  path: { [B in Path<A, never>]: string };
  request: Request;
}
type To = number | Error | ConstructorParameters<typeof Response>[0] | Response;
/** @internal */
type Handler<A extends unknown[], B extends string> = (on: On<B>, ...rest: A) =>
  | (To | Result<To, { [_: number]: To }>)
  | Promise<To | Result<To, { [_: number]: To }>>;
class Node<A> {
  self: { [_: string]: A | undefined } = Object.create(null);
  next?: { name: string; node: Node<A> };
  rest: { [_: string]: Node<A> } = Object.create(null);
}
/** HTTP router. */
export class Router<A extends unknown[] = []> {
  private tree: Node<Handler<A, string>> = new Node();
  /** Adds a route. */
  route<B extends string>(on: `${string} /${B}`, handler: Handler<A, B>): this {
    const [, method, path] = /^(\S+) (\S+)$/.exec(on) ?? [];
    if (!PATH.test(path)) throw Error(`Invalid route: ${JSON.stringify(on)}`);
    let node = this.tree;
    for (const [part, name] of path.matchAll(/#([^/#]+)|[^/]+/g)) {
      if (!name) node = node.rest[decodeURIComponent(part)] ??= new Node();
      else if (name === node.next?.name) node = node.next.node;
      else node.next = { name, node: node = new Node() };
    }
    for (const $ of method.split(",")) node.self[$] = handler;
    return this;
  }
  /** Handles a request (as an unbound arrow function). */
  fetch = async (request: Request, ...rest: A): Promise<Response> => {
    const on = { url: new URL(request.url), path: {} as any, request };
    let node = this.tree, to: any, status;
    for (let part of on.url.pathname.match(/(?<=\/)[^/]+/g) ?? []) {
      if (node.rest[part = decodeURIComponent(part)]) node = node.rest[part];
      else if (node.next) on.path[node.next.name] = part, node = node.next.node;
      else return new Response(null, { status: 404 });
    }
    const handler = node.self[request.method];
    if (!handler) return new Response(null, { status: 405 });
    try {
      to = await handler(on, ...rest);
      if (Object.hasOwn(to ?? {}, "error")) status = to.error, to = to.value;
    } catch ($) {
      to = $ instanceof Error ? $ : Error(`${$}`, { cause: $ }), status = 500;
    }
    if (to instanceof Response) return to;
    else if (typeof to === "number") return new Response(null, { status: to });
    else if (to instanceof Error) {
      return Response.json({
        name: to.name,
        message: to.message,
        cause: to.cause,
        stack: to.stack,
      }, { status: status ?? 400 });
    } else return new Response(to, { status: status ?? 200 });
  };
}
