import {
  assert,
  assertArrayIncludes,
  assertEquals,
} from "jsr:@std/assert@^1.0.14";
import fc from "npm:fast-check@^4.2.0";
import { fc_number, fc_string } from "../../test.ts";
import { array, boolean, number, object, string } from "../build.ts";
import { coder } from "../code.ts";
import { Data, Fail, Type } from "../schema.ts";
import { validator } from "../validate.ts";

const fc_enum = <A>($: fc.Arbitrary<A>) =>
  fc.uniqueArray($, { minLength: 3 }) as fc.Arbitrary<[A, A, ...A[]]>;
const test = <A extends Type>($: fc.Arbitrary<[A, Data<A>, Fail<A>]>) =>
  fc.assert(
    fc.property($, ([type, data, fail]) => {
      const a = validator(type), b = coder(type);
      if (data !== undefined) {
        const c = a(data).result;
        assert(c.is), assertEquals(c.value, data);
        const d = b.encode(c.value);
        assertEquals(d.length, b.length), assertEquals(b.decode(d), data);
      }
      if (fail !== undefined) {
        const c = a(fail.raw).result;
        assert(!c.is), assertArrayIncludes(c.value, [fail]);
      }
    }),
  );
const type = <A extends Type>(type: A, to: ($: unknown) => any, or: any) =>
  test(
    fc.jsonValue().map(($) => [type, to($) ? $ : or, {
      path: "",
      raw: to($) ? null : $,
      error: ["type", type.type] as const,
    } as Fail<A>]),
  );
Deno.test("boolean", () => {
  type(boolean().type, ($) => typeof $ === "boolean", true);
  test(
    fc.boolean().map(($) => [
      boolean().enum([$]).type,
      $,
      { path: "", raw: !$, error: ["enum", [$]] } as const,
    ]),
  );
});
Deno.test("number", () => {
  type(number().type, Number.isFinite as ($: any) => $ is number, 0);
  test(
    fc_enum(fc_number()).map(([head, ...rest]) => [
      number().enum(rest).type,
      rest[0],
      { path: "", raw: head, error: ["enum", rest] },
    ]),
  );
});
Deno.test("string", () => {
  type(string().type, ($) => typeof $ === "string" && $ === $.normalize(), "");
  test(
    fc_enum(fc_string().filter(($) => $ === $.normalize()))
      .map(([head, ...rest]) => [
        string().enum(rest).type,
        rest[0],
        { path: "", raw: head, error: ["enum", rest] },
      ]),
  );
});
Deno.test("array", () => {
  type(array().type, Array.isArray, []);
});
Deno.test("object", () => {
  type(
    object().type,
    ($) => typeof $ === "object" && $ && !Array.isArray($),
    {},
  );
});
