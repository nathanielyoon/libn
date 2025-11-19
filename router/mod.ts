/** @module */
import { PATH, type Path } from "./path.ts";
import { Responser } from "./response.ts";

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
  req: Request;
  /** Response builder. */
  res: Responser;
}
/** @internal */
type To<A extends unknown[], B extends string> = (
  this: Router<A>,
  source: Source<B>,
  ...context: A
) => Response | Promise<Response>;
const split = ($: string) => $.match(/(?<=\/)(?:\??[^/?]+|\?$)/g) ?? [];
/** HTTP router. */
export class Router<A extends unknown[] = []> {
  /** Map of each static route's concatenated method and path to its handler. */
  protected map: { [_: string]: To<A, string> | undefined } = {};
  /** Paths of static routes. */
  protected keys: Set<string> = new Set();
  /** Trie of parameterized routes and their handlers. */
  protected tree: Node<To<A, string>> = new Node();
  /** Default not-found handler. */
  protected 404({ res }: Source): Response | Promise<Response> {
    return res.status(404).build();
  }
  /** Default method-not-allowed handler. */
  protected 405({ res }: Source): Response | Promise<Response> {
    return res.status(405).build();
  }
  /** Default internal-server-error handler. */
  protected 500({ res }: Source, $: unknown): Response | Promise<Response> {
    return res.status(500).error($);
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
    const source = {
      url: new URL(request.url),
      path: {} as { [_: string]: string } & { ""?: string[] },
      req: request,
      res: new Responser(),
    } satisfies Source;
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
      return await to.call(this, source, ...context);
    } catch ($) {
      return await this[500](source, $);
    }
  }
}
