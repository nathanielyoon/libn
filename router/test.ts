import { assertEquals, assertMatch, assertThrows } from "@std/assert";
import fc from "fast-check";
import { Router } from "./mod.ts";
import { fcBin, fcStr } from "../test.ts";
import { Responser } from "./response.ts";
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
  parts.reduce((to, part) => `${to}/${part}`, "") || "/";
const fcErrorConstructor = fc.constantFrom<ErrorConstructor>(
  Error,
  EvalError,
  RangeError,
  ReferenceError,
  SyntaxError,
  TypeError,
  URIError,
);
const content = (type: string) => ({ headers: { "content-type": type } });

Deno.test("path.Path : valid/invalid paths", () => {
  const ok = <A extends string>($: Path<A>, raw = true) => {
    assertMatch($, PATH);
    raw && assertEquals(new URL($, "http://localhost").pathname, $);
  };
  const no = <A extends string>($: Path<A> extends never ? A : never) =>
    assertThrows(() => new Router().route("GET", $, ({ res }) => res.build()));
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
  ok("/__proto__");
  ok("/?__proto_!_", false);
  no(""), no("a");
  no("//a"), no("/a/"), no("/a//b");
  no("/?/"), no("/??a"), no("?/"), no("/a?"), no("/?a?");
  no("/?__proto__");
});
Deno.test("responser.status : status code", async () => {
  await fc.assert(fc.asyncProperty(
    fc.integer({ min: 200, max: 599 }),
    async (status) => {
      await assertResponse(
        new Responser().status(status).build(),
        new Response(null, { status }),
      );
    },
  ));
});
Deno.test("responser.headers : set/add/delete headers", async () => {
  await fc.assert(fc.asyncProperty(
    fcStr(/^[-a-z]+$/),
    fcStr({ unit: "grapheme-ascii" }),
    async (name, value) => {
      const responser = new Responser();
      const headers = new Headers([[name, value]]);
      await assertResponse(
        responser.header(name, value).build(),
        new Response(null, { headers }),
      );
      headers.append(name, value);
      await assertResponse(
        responser.append(name, value).build(),
        new Response(null, { headers }),
      );
      headers.delete(name);
      await assertResponse(responser.delete(name).build(), new Response());
    },
  ));
});
Deno.test("responser.body : content type", async () => {
  await fc.assert(fc.asyncProperty(
    fcBin(),
    fc.option(fcStr({ unit: "grapheme-ascii" }), { nil: undefined }),
    async (body, type) => {
      await assertResponse(
        new Responser().body(body, type),
        new Response(body, content(type ?? "application/octet-stream")),
      );
      await assertResponse(
        new Responser().blob(new Blob([body], { type: type! })),
        new Response(
          body,
          content(type?.toLowerCase() || "application/octet-stream"),
        ),
      );
    },
  ));
  await fc.assert(fc.asyncProperty(fcStr(), async (body) => {
    await assertResponse(
      new Responser().text(body),
      new Response(body, content("text/plain")),
    );
    await assertResponse(
      new Responser().html(body),
      new Response(body, content("text/html")),
    );
  }));
  await fc.assert(fc.asyncProperty(fc.jsonValue(), async (body) => {
    await assertResponse(
      new Responser().json(body),
      Response.json(body, content("application/json")),
    );
  }));
});
Deno.test("responser.redirect : redirect", async () => {
  await fc.assert(fc.asyncProperty(
    fc.webUrl().map(($) => new URL($)),
    fc.constantFrom(301, 302, 303, 307, 308),
    async (location, code) => {
      await assertResponse(
        new Responser().redirect(location),
        Response.redirect(location),
      );
      await assertResponse(
        new Responser().status(code).redirect(location),
        Response.redirect(location, code),
      );
    },
  ));
});
Deno.test("responser.error : error", async () => {
  await fc.assert(fc.asyncProperty(
    fcErrorConstructor,
    fcStr(),
    fc.bigInt(),
    async (constructor, message, cause) => {
      const error = constructor(message, { cause });
      await assertResponse(
        new Responser().error(error),
        Response.json({
          name: error.name,
          message: error.message,
          cause: `0x${cause.toString(16)}`,
          stack: error.stack,
        }, { status: 500, ...content("application/json") }),
      );
    },
  ));
});
Deno.test("router.route : fixed route", async () => {
  await fc.assert(fc.asyncProperty(
    fc.array(fcPart).map(join),
    async ($) => {
      await assertResponse(
        await new Router().route("GET", $, ({ res }) => res.text($)).fetch(
          request($),
        ),
        new Response($, content("text/plain")),
      );
    },
  ));
});
Deno.test("router.route : named route", async () => {
  await fc.assert(fc.asyncProperty(
    fc.array(fcPart),
    fcStr(/^[^\s/?]+$/).filter(($) => $ !== "__proto__"),
    fcPart,
    async (path, key, value) => {
      const router = new Router();
      for (const method of METHODS) {
        router.route(
          method,
          join([...path, `?${key}`]),
          ({ path, req, res }) => res.json({ method: req.method, path }),
        );
        await assertResponse(
          await router.fetch(request(join([...path, value]), method)),
          Response.json(
            { method, path: { [key]: decodeURIComponent(value) } },
            content("application/json"),
          ),
        );
      }
    },
  ));
});
Deno.test("router.route : catch-all route", async () => {
  await assertResponse(
    await new Router().route("GET", "/?", ({ res }) => res.text("")).fetch(
      request("/"),
    ),
    new Response("", content("text/plain")),
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
        Response.json(
          { "": rest.map(decodeURIComponent) },
          content("application/json"),
        ),
      );
    },
  ));
});
Deno.test("router.fetch : not found", async () => {
  await assertResponse(
    await new class extends Router {
      protected override 404() {
        return new Response("404", { status: 404 });
      }
    }().fetch(request("/")),
    new Response("404", { status: 404 }),
  );
  await fc.assert(fc.asyncProperty(
    fc.array(fcPart),
    fcPart,
    async (path, part) => {
      const router = new Router().route(
        "GET",
        join(path),
        ({ res }) => res.build(),
      );
      await assertResponse(
        await router.fetch(request(join([...path, part]))),
        new Response(null, { status: 404 }),
      );
    },
  ));
});
Deno.test("router.fetch : method not allowed", async () => {
  await assertResponse(
    await new class extends Router {
      protected override 405() {
        return new Response("405", { status: 405 });
      }
    }().route("POST", "/?", ({ res }) => res.build()).fetch(request("/")),
    new Response("405", { status: 405 }),
  );
  await fc.assert(fc.asyncProperty(
    fc.uniqueArray(fc.constantFrom(...METHODS), { minLength: 2 }),
    fc.array(fcPart).map(join),
    async ([head, ...tail], path) => {
      const router = new Router().route(
        head,
        path,
        ({ res }) => res.status(204).build(),
      );
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
Deno.test("router.fetch : internal server error", async () => {
  await assertResponse(
    await new class extends Router {
      protected override 500() {
        return new Response("500", { status: 500 });
      }
    }().route("GET", "/", () => {
      throw Error();
    }).fetch(request("/")),
    new Response("500", { status: 500 }),
  );
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
          stack: error.stack,
        }, { status: 500, ...content("application/json") }),
      );
    },
  ));
  await assertResponse(
    await new Router().route("GET", "/", () => {
      throw { toString: {} };
    }).fetch(request("/")),
    new Response(null, { status: 500 }),
  );
});
