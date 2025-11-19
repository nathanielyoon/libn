import { PATH, type Path } from "./path.ts";

export { PATH, type Path };
/** @internal */
class Node<A> {
  sub: { [_: string]: Node<A> } = Object.create(null);
  part?: { name: string; node: Node<A> };
  rest?: Node<A>;
  on: { [_: string]: A | undefined } = Object.create(null);
}
type Name<A extends string> = A extends `?${infer B}` ? B : never;
/** @internal */
type Parts<A extends string, B extends string> = A extends
  `${infer C}/${infer D}` ? Parts<D, B | Name<C>> : B | Name<A>;
/** Request context. */
export interface Source<A extends string = string> {
  /** Parsed URL. */
  url: URL;
  /** Path parameters, including an anonymous rest parameter if present. */
  path: { [B in Parts<A, never>]: B extends "" ? string[] : string };
  /** Original request. */
  request: Request;
}
type Out = Response | number | ConstructorParameters<typeof Response>[0];
/** @internal */
type To<A extends unknown[], B extends string> = (
  this: Router<A>,
  source: Source<B>,
  ...context: A
) => Out | Promise<Out>;
const split = ($: string) => $.match(/(?<=\/)(?:\??[^/?]+|\?$)/g) ?? [];
const wrap = ($: unknown) => {
  try {
    return $ instanceof Error
      ? { name: $.name, message: $.message, cause: $.cause, stack: $.stack }
      : { name: null, message: `${$}`, cause: $ };
  } catch {
    return null;
  }
};
/** HTTP router. */
export class Router<A extends unknown[] = []> {
  /** Map of each static route's concatenated method and path to its handler. */
  protected map: { [_: string]: To<A, string> | undefined } = {};
  /** Paths of static routes. */
  protected keys: Set<string> = new Set();
  /** Trie of parameterized routes and their handlers. */
  protected tree: Node<To<A, string>> = new Node();
  /** Default not-found handler. */
  protected 404(_: Source): Response | Promise<Response> {
    return new Response(null, { status: 404 });
  }
  /** Default method-not-allowed handler. */
  protected 405(_: Source): Response | Promise<Response> {
    return new Response(null, { status: 405 });
  }
  /** Default internal-server-error handler. */
  protected 500(_: Source, $: unknown): Response | Promise<Response> {
    return Response.json(wrap($), { status: 500 });
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
    } else {
      const key = new URL(path, "http://localhost").pathname;
      this.keys.add(key), this.map[method + key] = to;
    }
    return this;
  }
  /** Handles a request. */
  async fetch(request: Request, ...context: A): Promise<Response> {
    const source = { url: new URL(request.url), path: {} as any, request };
    const path = source.url.pathname;
    let to = this.map[request.method + path];
    find: if (!to) {
      let at = this.tree;
      for (let all = split(path), part, z = 0; z < all.length; ++z) {
        if (at.sub[part = decodeURIComponent(all[z])]) at = at.sub[part];
        else if (at.part) source.path[at.part.name] = part, at = at.part.node;
        else if (at.rest) {
          source.path[""] = all.slice(z).map(decodeURIComponent), at = at.rest;
          break;
        } else return this[this.keys.has(path) ? 405 : 404](source);
      }
      if (to = at.on[request.method]) break find;
      if (!at.rest?.on) return this[this.keys.has(path) ? 405 : 404](source);
      if (to = at.rest.on[request.method]) source.path[""] ??= [];
      else return await this[405](source);
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
