import { assertEquals } from "@std/assert";
import fc from "fast-check";
import { Router } from "./mod.ts";
import { fcStr } from "../test.ts";

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
