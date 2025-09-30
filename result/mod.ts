/**
 * Result type.
 *
 * @example Construction
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * assertEquals(no(0).result, { state: false, value: 0 });
 * assertEquals(ok(0).result, { state: true, value: 0 });
 * ```
 *
 * @example Chaining wrappers
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * const greeter = (tokens: Set<string>) => ($: Request) =>
 *   ok($)
 *     .bind(drop(($) => new URL($.url).pathname === "/" && "no path"))
 *     .bind_async(exec_async(async function* ($) {
 *       const header = yield* some($.headers.get("authorization"), "no header");
 *       const base64 = yield* some(/^Bearer (.+)$/.exec(header)?.[1], "no token");
 *       const token = yield* save(($: string) => atob($), ($) => {
 *         if ($ instanceof DOMException) return "invalid base64" as const;
 *         throw $;
 *       })(base64);
 *       yield* or({ state: tokens.has(token), value: "wrong token" });
 *       const text = await $.text();
 *       return text.toUpperCase();
 *     }))
 *     .fmap(($) => $.split(" "))
 *     .bind(drop(($) => $.length !== 2 && "too many names"))
 *     .bind(($) => each($.map(drop(($) => $.length > 9 && "name too long"))))
 *     .fmap(($) => `Hello, ${$[0]} ${$[1]}!`);
 * const greet = greeter(new Set(["abcd", "012345"]));
 * assertEquals(
 *   await greet(
 *     new Request("https://example.com/path", {
 *       method: "POST",
 *       headers: { authorization: "Bearer MDEyMzQ1" },
 *       body: "Firstname Lastname",
 *     }),
 *   ).unwrap_async(),
 *   "Hello, FIRSTNAME LASTNAME!",
 * );
 * ```
 *
 * @module result
 */

import { no, ok, Or, or, type Result } from "./src/or.ts";
import {
  drop,
  each,
  each_async,
  exec,
  exec_async,
  save,
  save_async,
  some,
} from "./src/wrap.ts";

export {
  drop,
  each,
  each_async,
  exec,
  exec_async,
  no,
  ok,
  Or,
  or,
  type Result,
  save,
  save_async,
  some,
};
