import {
  assert,
  assertEquals,
  assertMatch,
  assertStrictEquals,
} from "@std/assert";
import { assertType, type Has, type IsExact } from "@std/testing/types";
import fc from "fast-check";
import { isArray, type Json } from "@libn/json/lib";
import { deToken, enToken, get } from "@libn/json/pointer";

const fcJson = fc.jsonValue as (
  constraints?: fc.JsonSharedConstraints,
) => fc.Arbitrary<Json>;
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
Deno.test("pointer", async (t) => {
  await t.step('enToken() encodes "~" and "/"', () => {
    fc.assert(fc.property(fc.string(), ($) => {
      const encoded = enToken($);
      assertMatch(encoded, /^(?:~[01]|[^/~])*$/);
      assertEquals(encoded.length, $.length + ($.match(/[/~]/g)?.length ?? 0));
    }));
  });
  await t.step('deToken() decodes "/" and "~"', () => {
    fc.assert(fc.property(fc.string(), ($) => {
      const encoded = enToken($);
      const decoded = deToken(encoded);
      assertEquals(decoded, $);
      assertEquals(
        decoded.length,
        encoded.length - ($.match(/[/~]/g)?.length ?? 0),
      );
    }));
  });
  await t.step("get() returns the root for empty pointers", () => {
    fc.assert(fc.property(fcJson(), ($) => {
      assertEquals(get($, ""), $);
    }));
  });
  const fcPointer = fc.stringMatching(/^(?:\/(?:[^/~]|~[01])*)+$/);
  await t.step("get() rejects invalid pointers", () => {
    fc.assert(fc.property(
      fc.stringMatching(/^[^/]+$/),
      fcPointer,
      (prefix, pointer) => {
        assertEquals(get(null, prefix + pointer), undefined);
      },
    ));
  });
  await t.step("get() rejects non-object instances", () => {
    fc.assert(fc.property(
      fc.oneof(fc.boolean(), fc.double(), fc.string()),
      fcPointer,
      (instance, pointer) => {
        assertEquals(get(instance, pointer), undefined);
      },
    ));
  });
  await t.step("get() accesses object properties", () => {
    const object = { a: 0, "0": 1, "-": 2, "~": 3, "/": 4 };
    for (const $ of Object.keys(object) as (keyof typeof object)[]) {
      assertEquals(get(object, `/${enToken($)}`), object[$]);
    }
  });
  await t.step("get() accesses array elements", () => {
    const array = Array.from(Array(5).keys());
    for (const [key, value] of array.entries()) {
      assertEquals(get(array, `/${key}`), value);
    }
  });
  await t.step("get() accesses a path", () => {
    assertEquals(get({ a: [[{}, { b: { c: [0] } }]] }, "/a/0/1/b/c/0"), 0);
  });
  await t.step("get() rejects non-numeric or leading-zero indices", () => {
    for (const $ of ["a", "", "~0", "~1", "00", "01"]) {
      assertEquals(get([], `/${$}`), undefined);
    }
  });
  await t.step("get() rejects missing keys", () => {
    for (const $ of ["a", "", "~0", "~1", "00", "01"]) {
      assertEquals(get({}, `/${$}`), undefined);
    }
  });
});
