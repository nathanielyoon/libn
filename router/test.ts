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
  const all = await Promise.all([actual.arrayBuffer(), expected.arrayBuffer()]);
  assertEquals(all[0], all[1]);
};
const fcPath = fc.webPath().filter(($) =>
  URL.canParse($, "http://localhost")
) as fc.Arbitrary<`/${string}`>;

Deno.test("router.route : static routes", async () => {
  await fc.assert(fc.asyncProperty(fcPath, async (path) => {
    await assertResponse(
      await new Router().route("GET", path, () => path).fetch(request(path)),
      new Response(path),
    );
  }));
});
