import {
  assertEquals,
  assertNotEquals,
  assertRejects,
  assertThrows,
} from "@std/assert";
import fc from "fast-check";
import { fc_check, fc_str } from "../test.ts";
import { no, ok, Or, or } from "./src/or.ts";
import {
  drop,
  each,
  each_async,
  exec,
  exec_async,
  save,
  save_async,
  some,
} from "./src/wrap.ts";
import { Err } from "./src/error.ts";

Deno.test("err serializes", () =>
  fc_check(fc.property(
    fc_str(),
    fc.anything(),
    (message, cause) => {
      const err = new Err(message, cause);
      assertEquals(
        err.toJSON(),
        { name: err.name, message, cause, stack: err.stack },
      );
    },
  )));
Deno.test("err stringifies differently", () =>
  fc_check(fc.property(
    fc_str(),
    fc.anything(),
    (message, cause) =>
      assertNotEquals(
        `${new Err(message, cause)}`,
        `${Error(message, { cause })}`,
      ),
  )));
Deno.test("throw throws", () =>
  fc_check(fc.property(
    fc_str(),
    fc.anything(),
    (message, cause) => void assertThrows(() => Err.throw(message, cause)),
  )));
Deno.test("ok always passes", () =>
  fc_check(fc.property(
    fc.anything(),
    ($) => assertEquals(ok($).result, { state: true, value: $ }),
  )));
Deno.test("no always fails", () =>
  fc_check(fc.property(
    fc.anything(),
    ($) => assertEquals(no($).result, { state: false, value: $ }),
  )));
Deno.test("or sometimes passes sometimes fails", () =>
  fc_check(fc.property(
    fc.boolean(),
    fc.anything(),
    (state, value) =>
      assertEquals(or({ state, value }).result, { state, value }),
  )));
const fc_or = fc.boolean().map(($) => $ ? ok($) : no($));
Deno.test("constructor takes promises", () =>
  fc_check(fc.asyncProperty(fc_or, async ($) =>
    assertEquals(
      await new Or(null, Promise.resolve($.result)).result_async,
      $.result,
    ))));
Deno.test("fmap/fmap_async apply conditionally", async () => {
  fc_check(fc.property(
    fc_or,
    ($) => assertEquals($.fmap(($) => !$).unwrap(), false),
  ));
  fc_check(fc.property(fc_or, ($) =>
    assertEquals(
      $.fmap(($) => $, ($) => !$).unwrap(),
      true,
    )));
  await fc_check(fc.asyncProperty(fc_or, async ($) =>
    assertEquals(
      await $.fmap_async(($) => Promise.resolve(!$)).unwrap_async(),
      false,
    )));
  await fc_check(fc.asyncProperty(fc_or, async ($) =>
    assertEquals(
      await $.fmap_async(($) => Promise.resolve($), ($) => Promise.resolve(!$))
        .unwrap_async(),
      true,
    )));
});
Deno.test("bind/bind_async only map successes", async () => {
  fc_check(fc.property(
    fc_or,
    ($) => assertEquals($.bind(($) => ok(!$)).unwrap(), false),
  ));
  await fc_check(fc.asyncProperty(fc_or, async ($) =>
    assertEquals(
      await $.bind_async(($) => Promise.resolve(ok(!$))).unwrap_async(),
      false,
    )));
});
Deno.test("result/result_async unions discriminate", () => {
  fc_check(
    fc.property(fc_or, ($) => assertEquals($.result.state, $.result.value)),
  );
  fc_check(fc.asyncProperty(fc_or, async ($) => {
    const { state, value } = await $.result_async;
    assertEquals(state, value);
  }));
});
Deno.test("unwrap/unwrap_async pass through or throw/reject", async () => {
  fc_check(fc.property(fc_or, ($) => assertEquals($.unwrap(), $.result.state)));
  fc_check(fc.property(fc_or, ($) => void $.unwrap($.result.state)));
  fc_check(fc.property(
    fc_or,
    ($) => void assertThrows(() => $.unwrap(!$.result.state)),
  ));
  await fc_check(fc.asyncProperty(
    fc_or,
    async ($) => assertEquals(await $.unwrap_async(), $.result.state),
  ));
  await fc_check(fc.asyncProperty(
    fc_or,
    async ($) => void await $.unwrap_async($.result.state),
  ));
  await fc_check(fc.asyncProperty(
    fc_or,
    async ($) =>
      void await assertRejects(() => $.unwrap_async(!$.result.state)),
  ));
});
Deno.test("sync methods apply to async results", () =>
  fc_check(fc.asyncProperty(
    fc_or.map(($) => $.fmap_async(($) => Promise.resolve($))),
    async ($) => {
      const { state } = await $.result_async;
      assertEquals(await $.fmap(($) => $).unwrap_async(), state);
      assertEquals(await $.bind(($) => ok($)).unwrap_async(), state);
    },
  )));
Deno.test("sync openers throw if result is async", () =>
  fc_check(fc.property(
    fc_or.map(($) => $.fmap_async(($) => Promise.resolve($))),
    ($) => {
      assertThrows(() => $.result);
      assertThrows(() => $.unwrap());
    },
  )));
Deno.test("some converts nullish values", () =>
  fc_check(fc.property(
    fc.option(fc.nat()),
    fc.option(fc.nat()),
    ($, if_nullish) =>
      assertEquals(some($, if_nullish).unwrap(), $ == null ? if_nullish : $),
  )));
Deno.test("drop filters by predicate", () =>
  fc_check(fc.property(
    fc.boolean(),
    fc.nat(),
    (keep, $) => assertEquals(drop(() => !keep)($).unwrap(), keep ? $ : true),
  )));
Deno.test("save/save_async try-catch", async () => {
  fc_check(fc.property(
    fc.boolean(),
    fc.nat(),
    fc.nat(),
    (error, thrown, $) =>
      assertEquals(
        save(($) => {
          if (error) throw thrown;
          return $;
        })($).fmap(($) => $, ($) => $.cause).unwrap(),
        error ? thrown : $,
      ),
  ));
  fc_check(fc.property(
    fc.boolean(),
    fc.nat(),
    fc.nat(),
    fc.nat(),
    (error, thrown, caught, $) =>
      assertEquals(
        save(($) => {
          if (error) throw thrown;
          return $;
        }, (thrown) => Number(thrown) + caught)($).unwrap(),
        error ? thrown + caught : $,
      ),
  ));
  await fc_check(fc.asyncProperty(
    fc.boolean(),
    fc.nat(),
    fc.nat(),
    async (error, thrown, $) =>
      assertEquals(
        await (await save_async(($) => {
          if (error) throw thrown;
          return $;
        })($)).fmap(($) => $, ($) => $.cause).unwrap_async(),
        error ? thrown : $,
      ),
  ));
  await fc_check(fc.asyncProperty(
    fc.boolean(),
    fc.nat(),
    fc.nat(),
    fc.nat(),
    async (error, thrown, caught, $) =>
      assertEquals(
        await (await save_async(($) => {
          if (error) throw thrown;
          return Promise.resolve($);
        }, ($) => Promise.resolve(Number($) + caught))($)).unwrap_async(),
        error ? thrown + caught : $,
      ),
  ));
});
Deno.test("exec/exec_async return early", async () => {
  fc_check(fc.property(
    fc.tuple(fc.boolean(), fc.nat()),
    fc.tuple(fc.boolean(), fc.nat()),
    fc.nat(),
    (one, two, $) =>
      assertEquals(
        exec(function* ($: number) {
          const a = yield* one[0] ? no(one[1]) : ok(one[1]);
          const b = yield* two[0] ? no(two[1]) : ok(two[1]);
          return $ + a + b;
        })($).unwrap(),
        one[0] ? one[1] : two[0] ? two[1] : $ + one[1] + two[1],
      ),
  ));
  await fc_check(fc.asyncProperty(
    fc.tuple(fc.boolean(), fc.nat()),
    fc.tuple(fc.boolean(), fc.nat()),
    fc.nat(),
    async (one, two, $) =>
      assertEquals(
        await (await exec_async(async function* ($: number) {
          const a = yield* one[0] ? no(one[1]) : ok(one[1]);
          const b = yield* two[0] ? no(two[1]) : ok(two[1]);
          return $ + a + b;
        })($)).unwrap_async(),
        one[0] ? one[1] : two[0] ? two[1] : $ + one[1] + two[1],
      ),
  ));
});
Deno.test("wrap/wrap_async fail/pass all together", async () => {
  fc_check(fc.property(fc_or, fc_or, (one, two) =>
    assertEquals<any>(
      each([one, two]),
      one.result.state && two.result.state
        ? ok([one.unwrap(), two.unwrap()])
        : no([one.result, two.result]),
    )));
  await fc_check(fc.asyncProperty(
    fc_or.map(($) => $.fmap_async(($) => Promise.resolve(!$))),
    fc_or.map(($) => $.fmap_async(($) => Promise.resolve(!$))),
    async (one, two) =>
      assertEquals<any>(
        await each_async([one, two]),
        (await one.result_async).state && (await two.result_async).state
          ? ok([await one.unwrap_async(), await two.unwrap_async()])
          : no([await one.result_async, await two.result_async]),
      ),
  ));
});
