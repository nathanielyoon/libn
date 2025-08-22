import { assertEquals } from "jsr:@std/assert@^1.0.14";
import fc from "npm:fast-check@^4.2.0";
import type { Data, Fail, Intersect, Kind, Type } from "../json.ts";
import { coder } from "../code.ts";
import { validator } from "../validate.ts";
import { bit, int, num } from "../build.ts";
import { fc_number, fc_string } from "../../test.ts";

type FcMaybe<A> = A | fc.Arbitrary<A>;
const fc_maybe = <A>($: FcMaybe<A>) =>
  $ instanceof fc.Arbitrary ? $ : fc.constant($);
const test = <A extends Kind>(
  kind: A,
  step: (
    tester: <B extends Type<A>>(
      keyword: keyof B & string,
      arbitrary: FcMaybe<
        readonly [
          FcMaybe<{ type: B }>,
          ok: FcMaybe<Data<B>>,
          no: FcMaybe<unknown>,
          path?: FcMaybe<string>,
        ]
      >,
    ) => Promise<boolean>,
  ) => Promise<void>,
) =>
  Deno.test(
    kind,
    ($) =>
      step((keyword, arbitrary) =>
        $.step(keyword, () =>
          fc.assert(fc.property(
            fc_maybe(arbitrary).chain(([type, ok, no, path]) =>
              fc.record({
                type: fc_maybe(type).map(($) => $.type),
                ok: fc_maybe(ok),
                no: fc_maybe(no),
                path: fc_maybe(path),
              })
            ),
            ({ type, ok, no, path }) => {
              const a = coder(type), b = a.encode(ok);
              assertEquals(b.length, a.length), assertEquals(a.decode(b), ok);
              const c = validator(type);
              assertEquals(c(ok), ok);
              assertEquals(
                c(no),
                new Set([{
                  expected: [keyword, type[keyword]],
                  received: [path ?? "", no],
                } as Fail<typeof type>]),
              );
            },
          )))
      ),
  );
test("bit", async (step) => {
  await step("type", [bit(), fc.boolean(), fc.oneof(fc_number())]);
  await step("enum", fc.boolean().map(($) => [bit().enum([$]), $, !$]));
});
const fc_non_empty_set = <A>($: fc.Arbitrary<A>) =>
  fc.uniqueArray($, { minLength: 2 }) as fc.Arbitrary<[A, A, ...A[]]>;
test("int", async (step) => {
  await step("type", [
    int(),
    fc.maxSafeInteger(),
    fc.oneof(
      fc.boolean(),
      fc_number({ noInteger: true }),
      fc_number({ min: Number.MAX_SAFE_INTEGER + 1 }),
      fc_number({ max: Number.MIN_SAFE_INTEGER - 1 }),
      fc.constantFrom(NaN, Infinity, -Infinity),
    ),
  ]);
  // await step(
  //   "enum",
  //   fc_non_empty_set(fc.maxSafeInteger()).chain(([head, ...rest]) =>

  //   ),
  // );
});
test("num", async (step) => {
  await step("type", [
    num(),
    fc_number(),
    fc.oneof(fc.boolean(), fc.constantFrom(NaN, Infinity, -Infinity)),
  ]);
});
