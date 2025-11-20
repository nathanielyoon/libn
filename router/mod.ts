const PATH =
  /^(?:\/(?:[A-Za-z\d-_~!$&'()*+,;=:@]|%[\dA-Fa-f]{2})+|\/#(?!__proto__)[^/#]+)+$|^\/$/;
type Name<A extends string> = A extends `#${infer B}` ? B : never;
type Path<A extends string, B extends string> = A extends
  `${infer C}/${infer D}` ? Path<D, B | Name<C>> : B | Name<A>;
interface Source<A extends string = string> {
  url: URL;
  path: { [B in Path<A, never>]: string };
  request: Request;
}
/** @internal */
type Handler<A extends unknown[], B extends string> = (
  this: Router<A>,
  source: Source<B>,
  ...context: A
) => Response | Promise<Response>;
class Node<A> {
  self: { [_: string]: A | undefined } = Object.create(null);
  next?: { name: string; node: Node<A> };
  rest: { [_: string]: Node<A> } = Object.create(null);
}
/** Wraps an `Error` in a `Response`. */
export const error = ($: Error, status: number): Response =>
  Response.json({
    name: $.name,
    message: $.message,
    cause: $.cause,
    stack: $.stack?.match(/(?<=^\s*).+$/gm),
  }, { status });
/** HTTP router. */
export class Router<A extends unknown[] = []> {
  private tree: Node<Handler<A, string>> = new Node();
  /** Adds a route. */
  route<B extends string>($: `${string} /${B}`, handler: Handler<A, B>): this {
    const [, method, path] = /^(\S+) (\S+)$/.exec($) ?? [];
    if (!PATH.test(path)) throw Error(`Invalid route: ${JSON.stringify($)}`);
    let at = this.tree;
    for (const [part, name] of path.matchAll(/#([^/#]+)|[^/]+/g)) {
      if (!name) at = at.rest[decodeURIComponent(part)] ??= new Node();
      else if (name === at.next?.name) at = at.next.node;
      else at.next = { name, node: at = new Node() };
    }
    return at.self[method] = handler, this;
  }
  /** Handles a request. */
  async fetch(request: Request, ...context: A): Promise<any> {
    const source = { url: new URL(request.url), path: {} as any, request };
    let at = this.tree;
    for (let part of source.url.pathname.match(/(?<=\/)[^/]+/g) ?? []) {
      if (at.rest[part = decodeURIComponent(part)]) at = at.rest[part];
      else if (at.next) source.path[at.next.name] = part, at = at.next.node;
      else return new Response(null, { status: 404 });
    }
    const to = at.self[request.method];
    if (!to) return new Response(null, { status: 405 });
    try {
      return await to.call(this, source, ...context);
    } catch (cause) {
      return error(
        cause instanceof Error ? cause : Error(`${cause}`, { cause }),
        500,
      );
    }
  }
}
