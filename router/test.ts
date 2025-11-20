import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import fc from "fast-check";
import { Router } from "./mod.ts";
import { fcStr } from "../test.ts";

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
  assertEquals([...actual.headers], [...expected.headers]);
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
  (parts.reduce((to, part) => `${to}/${part}`, "") || "/") as `/${string}`;
const fcErrorConstructor = fc.constantFrom<ErrorConstructor>(
  Error,
  EvalError,
  RangeError,
  ReferenceError,
  SyntaxError,
  TypeError,
  URIError,
);

Deno.test("router.route : fixed route", async () => {
  assertThrows(() => new Router().route("", "//", () => new Response()));
  await fc.assert(fc.asyncProperty(
    fc.array(fcPart).map(join),
    async ($) => {
      await assertResponse(
        await new Router().route("GET", $, () => new Response($)).fetch(
          request($),
        ),
        new Response($),
      );
    },
  ));
});
Deno.test("router.route : named route", async () => {
  assertThrows(() => new Router().route("", "/#", () => new Response()));
  await fc.assert(fc.asyncProperty(
    fc.array(fcPart),
    fcStr(/^[^\s/#]+$/).filter(($) => $ !== "__proto__"),
    fcPart,
    async (path, key, value) => {
      const router = new Router();
      for (const method of METHODS) {
        router.route(
          method,
          join([...path, `#${key}`]),
          ({ path, request }) =>
            Response.json({ method: request.method, path }),
        );
        await assertResponse(
          await router.fetch(request(join([...path, value]), method)),
          Response.json({ method, path: { [key]: decodeURIComponent(value) } }),
        );
      }
    },
  ));
});
Deno.test("router.fetch : not found", async () => {
  await fc.assert(fc.asyncProperty(
    fc.array(fcPart),
    fcPart,
    async (path, part) => {
      const router = new Router().route(
        "GET",
        join(path),
        () => new Response(),
      );
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
      const router = new Router().route(
        head,
        path,
        () => new Response(),
      );
      await assertResponse(
        await router.fetch(request(path, head)),
        new Response(),
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
Deno.test("router.fetch : internal server error", async () => {
  await fc.assert(fc.asyncProperty(
    fcErrorConstructor,
    fcStr(),
    fc.jsonValue(),
    async (constructor, message, cause) => {
      const error = constructor(message, { cause });
      await assertResponse(
        await new Router().route("GET", "/", () => {
          throw error;
        }).fetch(request("/")),
        Response.json({
          name: error.name,
          message: error.message,
          cause: error.cause,
          stack: error.stack?.match(/(?<=^\s*).+$/gm),
        }, { status: 500 }),
      );
    },
  ));
  assertRejects(() =>
    new Router().route("GET", "/", () => {
      throw { toString: {} };
    }).fetch(request("/"))
  );
});
