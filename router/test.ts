import { assertEquals, assertMatch, assertThrows } from "@std/assert";
import fc from "fast-check";
import { Router } from "./mod.ts";
import { fcStr } from "../test.ts";
import { PATH, type Path } from "./path.ts";

const METHODS = [
  "GET",
  "HEAD",
  "POST",
  "PUT",
  "DELETE",
  "OPTIONS",
  "PATCH",
] as const;
const request = (path: string, method: typeof METHODS[number] = "GET") =>
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
    // other unreserved, excluding period
    ..."-_~",
    // pct-encoded
    ...Array(128).keys().filter(($) => $ !== 0x2e).map(($) =>
      `%${$.toString(16).padStart(2, "0")}`
    ),
    // sub-delims
    ..."!$&'()*+,;=",
    // others
    ...":@",
  ),
  minLength: 1,
});
const join = (parts: string[]) =>
  parts.reduce((to, part) => `${to}/${part}`, "") || "/";

Deno.test("path.Path : valid/invalid paths", () => {
  const ok = <A extends string>($: Path<A>, raw = true) => {
    assertMatch($, PATH);
    raw && assertEquals(new URL($, "http://localhost").pathname, $);
  };
  const no = <A extends string>($: Path<A> extends never ? A : never) =>
    assertThrows(() => new Router().route("GET", $, () => ""));
  ok("/?a", false), ok("/?", false), ok("/?a/b/?c/d/?e/?", false);
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
  no(""), no("a");
  no("//a"), no("/a/"), no("/a//b");
  no("/?/"), no("/??a"), no("?/"), no("/a?"), no("/?a?");
});
Deno.test("router.route : fixed route", async () => {
  await fc.assert(fc.asyncProperty(
    fc.array(fcPart).map(join),
    async ($) => {
      await assertResponse(
        await new Router().route("GET", $, () => $).fetch(request($)),
        new Response($),
      );
    },
  ));
});
Deno.test("router.route : named route", async () => {
  await fc.assert(fc.asyncProperty(
    fc.array(fcPart),
    fcStr(/^[^\s/?]+$/),
    fcPart,
    async (path, key, value) => {
      const router = new Router();
      for (const method of METHODS) {
        router.route(
          method,
          join([...path, `?${key}`]),
          ($) => Response.json({ method: $.request.method, path: $.path }),
        );
        await assertResponse(
          await router.fetch(request(join([...path, value]), method)),
          Response.json({ method, path: { [key]: decodeURIComponent(value) } }),
        );
      }
    },
  ));
});
Deno.test("router.route : catch-all route", async () => {
  await assertResponse(
    await new Router().route("GET", "/?", () => "").fetch(request("/")),
    new Response(""),
  );
  await fc.assert(fc.asyncProperty(
    fc.array(fcPart),
    fc.array(fcPart),
    async (base, rest) => {
      await assertResponse(
        await new Router().route(
          "GET",
          join([...base, "?"]),
          ($) => Response.json($.path),
        ).fetch(request(join([...base, ...rest]))),
        Response.json({ "": rest.map(decodeURIComponent) }),
      );
    },
  ));
});
Deno.test("router.fetch : not found", async () => {
  await fc.assert(fc.asyncProperty(fc.array(fcPart).map(join), async (path) => {
    await assertResponse(
      await new Router().fetch(request(path)),
      new Response(null, { status: 404 }),
    );
  }));
  await fc.assert(fc.asyncProperty(
    fc.array(fcPart),
    fcPart,
    async (path, part) => {
      const router = new Router().route("GET", join(path), () => "");
      await assertResponse(
        await router.fetch(request(join([...path, part]))),
        new Response(null, { status: 404 }),
      );
    },
  ));
});
Deno.test("router.fetch : method not allowed", async () => {
  await fc.assert(fc.asyncProperty(
    fc.uniqueArray(fc.constantFrom(...METHODS), { minLength: 2 }),
    fc.array(fcPart).map(join),
    async ([head, ...tail], path) => {
      const router = new Router().route(head, path, () => 204);
      await assertResponse(
        await router.fetch(request(path, head)),
        new Response(null, { status: 204 }),
      );
      for (const method of tail) {
        await assertResponse(
          await router.fetch(request(path, method)),
          new Response(null, { status: 405 }),
        );
      }
    },
  ));
});
