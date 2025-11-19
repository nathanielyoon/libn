import { type } from "@libn/types";
import { assertEquals } from "@std/assert";
import fc from "fast-check";
import { Router } from "./mod.ts";
import { fcStr } from "../test.ts";
import type { Path } from "./path.ts";

const request = (path: string, method = "GET") =>
  new Request(new URL(path, "http://localhost"), { method });
const assertResponse = async (actual: Response, expected: Response) => {
  assertEquals(actual.url, expected.url);
  assertEquals(actual.status, expected.status);
  assertEquals(actual.headers, expected.headers);
  const all = await Promise.all([actual.text(), expected.text()]);
  assertEquals(all[0], all[1]);
};
const fcPart = fcStr({
  unit: fc.constantFrom(
    // ALPHA
    ..."ABCDEFGHIJKLMNOPQRSTUVWXYZ",
    ..."abcdefghijklmnopqrstuvwxyz",
    // DIGIT
    ..."0123456789",
    // other unreserved
    ..."-._~",
    // pct-encoded
    ...Array(128).keys().map(($) => `%${$.toString(16).padStart(2, "0")}`),
    // sub-delims
    ..."!$&'()*+,;=",
    // others
    ...":@",
  ),
  minLength: 1,
});
const fcPath = fc.array(fcPart, { minLength: 1 }).map(($) => ({
  all: $,
  one: `/${$.join("/")}` as const,
}));

Deno.test("path.Path : valid/invalid paths", () => {
  const ok = <A extends string>($: Path<A>) =>
    assertEquals(new URL($, "http://localhost").pathname, $);
  const no = <A extends string>($: Path<A> extends never ? A : never) => {};
  ok("/a/b/c/d/e/f/g/h/i/j/k/l/m/n/o/p/q/r/s/t/u/v/w/x/y/z");
  ok("/A/B/C/D/E/F/G/H/I/J/K/L/M/N/O/P/Q/R/S/T/U/V/W/X/Y/Z");
  ok("/0/1/2/3/4/5/6/7/8/9");
  ok("/-_~"), ok("/!$&'()*+,;="), ok("/:/@");
  for (const one of [0, 1, 2, 3, 4, 5, 6, 7] as const) {
    for (
      const two of [
        "0",
        "1",
        "2",
        "3",
        "4",
        "5",
        "6",
        "7",
        "8",
        "9",
        "A",
        "a",
        "B",
        "b",
        "C",
        "c",
        "D",
        "d",
        "E",
        "e",
        "F",
        "f",
      ] as const
    ) one === 2 && two.toLowerCase() === "e" || ok(`/%${one}${two}`);
  }
  no(""), no("/"), no("a");
  no("//a"), no("/a/"), no("/a//b");
  no("/?/"), no("/??a"), no("?/"), no("/a?"), no("/?a?");
});
Deno.test("router.route : static routes", async () => {
  await fc.assert(fc.asyncProperty(fcPath, async ({ one }) => {
    await assertResponse(
      await new Router().route("GET", one, () => one).fetch(request(one)),
      new Response(one),
    );
  }));
});
Deno.test("router.route : dynamic routes", async () => {
  await fc.assert(fc.asyncProperty(
    fcPath,
    fcStr(/^[^\s/?]+$/),
    fcPart,
    async (path, key, value) => {
      await assertResponse(
        await new Router().route(
          "GET",
          `${path.one}/?${key}`,
          ($) => Response.json($.path),
        ).fetch(request(`${path.one}/${value}`)),
        Response.json({ [key]: decodeURIComponent(value) }),
      );
    },
  ));
});
