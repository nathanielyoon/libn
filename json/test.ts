import { assert, assertEquals, assertStrictEquals } from "@std/assert";
import { assertType, type Has, type IsExact } from "@std/testing/types";
import fc from "fast-check";
import { isArray } from "@libn/json/lib";

Deno.test("lib", async (t) => {
  await t.step("isArray() is Array.isArray", () => {
    assertStrictEquals(isArray, Array.isArray);
  });
  await t.step("isArray() checks mutable and readonly arrays", () => {
    fc.assert(fc.property(fc.option(fc.constant<[]>([])), ($) => {
      assertType<Has<typeof $, any[]>>(true);
      if (isArray($)) assertType<IsExact<typeof $, []>>(true), assert($);
      else assertType<IsExact<typeof $, null>>(true), assert(!$);
    }));
    fc.assert(fc.property(fc.option(fc.constant([])), ($) => {
      assertType<Has<typeof $, readonly any[]>>(true);
      if (isArray($)) {
        assertType<IsExact<typeof $, readonly []>>(true), assert($);
      } else assertType<IsExact<typeof $, null>>(true), assert(!$);
    }));
  });
});
