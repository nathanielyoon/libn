import { assertEquals, assertThrows } from "@std/assert";
import fc from "fast-check";
import { fcStr } from "../test.ts";
import { Err } from "@libn/result";
import type { Json } from "@libn/types";

Deno.test("Err : error parameters", () => {
  fc.assert(fc.property(fcStr(), fc.anything(), (message, cause) => {
    const err = new Err(cause, message);
    assertEquals(err.message, message);
    assertEquals(err.cause, cause);
    assertEquals(err.name, Err.name);
    assertEquals(err.context, []);
  }));
});
Deno.test("Err.catch : Error", () => {
  fc.assert(fc.property(fcStr(), fc.anything(), (message, cause) => {
    const error = new Error(message, { cause }), err = Err.catch(error);
    assertEquals(err.message, error.message);
    assertEquals(err.cause, error.cause);
    assertEquals(err.stack, error.stack);
  }));
});
Deno.test("Err.catch : non-Error", () => {
  fc.assert(fc.property(fc.jsonValue(), ($) => {
    const err = Err.catch($);
    assertEquals(err.message, "");
    assertEquals(err.cause, $);
  }));
});
Deno.test("Err.try : unsafe", () => {
  fc.assert(fc.property(fcStr().map(($) => `"${$}"`), ($) => {
    const result = Err.try<Json>(() => JSON.parse($));
    if (result.state) assertEquals(result.value, JSON.parse($));
    else assertThrows(() => result.value, Err);
  }));
});
Deno.test("Err.tryAsync : unsafe", async () => {
  await fc.assert(fc.asyncProperty(
    fcStr().map(($) => new Response(`"${$}"`)),
    async ($) => {
      const result = await Err.tryAsync<Json>(() => $.clone().json());
      if (result.state) assertEquals(result.value, await $.json());
      else assertThrows(() => result.value, Err);
    },
  ));
});
Deno.test("err.with : context", () => {
  fc.assert(fc.property(
    fcStr(),
    fc.jsonValue() as fc.Arbitrary<Json>,
    (info, data) => {
      assertEquals(new Err(null).with(info, data).context, [{ info, data }]);
    },
  ));
});
Deno.test("err.toJSON : safe", () => {
  fc.assert(fc.property(fc.jsonValue(), ($) => {
    const err = new Err($);
    assertEquals(err.toJSON(), {
      name: Err.name,
      message: "",
      cause: $,
      context: [],
      stack: err.stack,
    });
  }));
});
Deno.test("err.toJSON : unsafe", () => {
  fc.assert(fc.property(fc.bigInt(), ($) => {
    const err = new Err($);
    assertEquals(err.toJSON(), {
      name: Err.name,
      message: "",
      cause: undefined,
      context: [],
      stack: err.stack,
    });
  }));
});
