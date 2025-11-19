import { PATH, type Path } from "./path.ts";

class Node<A> {
  on: { [_: string]: A | undefined } = {};
  sub: { [_: string]: Node<A> } = Object.create(null);
  part?: { name: string; node: Node<A> };
  rest?: Node<A>;
}
type Name<A extends string> = A extends `?${infer B}` ? B : never;
/** @internal */
type Parts<A extends string, B extends string> = A extends
  `${infer C}/${infer D}` ? Parts<D, B | Name<C>> : B | Name<A>;
/** Request context. */
export interface Source<A extends string> {
  /** Parsed URL. */
  url: URL;
  /** Path parameters, including an anonymous rest parameter if present. */
  path: { [B in Parts<A, never>]: B extends "" ? string[] : string };
  /** Original request. */
  request: Request;
}
export type { Path };
/** @internal */
type To<A extends unknown[], B extends string> = (
  this: Router<A>,
  source: Source<B>,
  ...context: A
) => number | BodyInit | Response | Promise<number | BodyInit | Response>;
const split = ($: string) => $.match(/(?<=\/)(?:\??[^/?]+|\?$)/g) ?? [];
/** Simple tree router. */
export class Router<A extends unknown[] = []> {
  private map: { [_: string]: To<A, string> | undefined } = {};
  private tree: Node<To<A, string>> = new Node();
  /** Default not-found handler. */
  protected 404(_: Source<string>): Response | Promise<Response> {
    return new Response(null, { status: 404 });
  }
  /** Default method-not-allowed handler. */
  protected 405(_: Source<string>): Response | Promise<Response> {
    return new Response(null, { status: 405 });
  }
  /** Default internal-server-error handler. */
  protected 500(_: Source<string>, $: unknown): Response | Promise<Response> {
    return Response.json(
      $ instanceof Error
        ? { name: $.name, message: $.message, cause: $.cause, stack: $.stack }
        : { name: "", message: `${$}`, cause: $ },
      { status: 500 },
    );
  }
  /** Adds a route. */
  route<B extends string>(method: string, path: Path<B>, to: To<A, B>): this {
    if (!PATH.test(path)) throw Error(`Invalid path: ${JSON.stringify(path)}`);
    else if (/\/\?/.test(path)) {
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
    const source = {
      url: new URL(request.url),
      path: {} as { [_: string]: string } & { ""?: string[] },
      request,
    };
    let to = this.map[request.method + source.url.pathname];
    if (!to) {
      let at = this.tree;
      for (let all = split(source.url.pathname), z = 0; z < all.length; ++z) {
        const part = decodeURIComponent(all[z]);
        if (at.sub[part]) at = at.sub[part];
        else if (at.part) source.path[at.part.name] = part, at = at.part.node;
        else if (at.rest) {
          source.path[""] = all.slice(z).map(decodeURIComponent), at = at.rest;
          break;
        } else return await this[404](source);
      }
      if (!(to = at.on[request.method])) {
        if (!at.rest) return await this[405](source);
        if (!(to = at.rest.on[request.method])) return await this[405](source);
        source.path[""] ??= [];
      }
    }
    try {
      const out = await to.call(this, source, ...context);
      if (out instanceof Response) return out;
      if (typeof out === "number") return new Response(null, { status: out });
      return new Response(out);
    } catch ($) {
      return await this[500](source, $);
    }
  }
}
