import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import fc from "fast-check";
import { fc_check } from "../test.ts";
import {
  drop,
  exec,
  exec_async,
  no,
  ok,
  Or,
  save,
  save_async,
  some,
} from "./mod.ts";

const fc_or = fc.boolean().map(($) => $ ? ok($) : no($));
Deno.test("constructor takes promises", () =>
  fc_check(fc.asyncProperty(fc_or, async ($) =>
    assertEquals(
      await new Or(Promise.resolve($.result)).result_async,
      $.result,
    ))));
Deno.test("fmap/fmap_async apply conditionally", async () => {
  fc_check(fc.property(
    fc_or,
    ($) => assertEquals($.fmap(($) => !$).unwrap(), false),
  ));
  fc_check(fc.asyncProperty(fc_or, async ($) =>
    assertEquals(
      await $.fmap(($) => !$, ($) => !$).unwrap_async(),
      !$.result.state,
    )));
  await fc_check(fc.asyncProperty(fc_or, async ($) =>
    assertEquals(
      await $.fmap_async(async ($) => !$).unwrap_async(),
      false,
    )));
  await fc_check(fc.asyncProperty(fc_or, async ($) =>
    assertEquals(
      await $.fmap_async(async ($) => !$, async ($) => !$).unwrap_async(),
      !(await $.result_async).state,
    )));
});
Deno.test("bind/bind_async only map successes", async () => {
  fc_check(fc.property(
    fc_or,
    ($) => assertEquals($.bind(($) => ok(!$)).unwrap(), false),
  ));
  await fc_check(fc.asyncProperty(fc_or, async ($) =>
    assertEquals(
      await $.bind_async(async ($) => ok(!$)).unwrap_async(),
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
Deno.test("sync methods apply to async results", async () => {
  fc_check(fc.asyncProperty(fc_or.map(($) => $.fmap(($) => $)), async ($) => {
  }));
  await fc_check(fc.asyncProperty(fc_or, async ($) =>
    assertEquals(
      await $.fmap_async(async ($) => !$).fmap(($) => !$).unwrap_async(),
      (await $.result_async).state,
    )));
  await fc_check(fc.asyncProperty(fc_or, async ($) =>
    assertEquals(
      await $.bind_async(async ($) => ok($)).bind(($) => ok($)).unwrap_async(),
      (await $.result_async).state,
    )));
});
Deno.test("sync openers throw if result is async", () =>
  fc_check(fc.property(
    fc_or.map(($) => $.fmap_async(async ($) => $)),
    ($) => {
      assertThrows(() => $.result);
      assertThrows(() => $.unwrap());
    },
  )));
Deno.test("some lifts nullish values", () => {
  fc_check(fc.property(
    fc.option(fc.nat()),
    fc.option(fc.nat()),
    (if_nullish, $) =>
      assertEquals(some(if_nullish)($).unwrap(), $ == null ? if_nullish : $),
  ));
  fc_check(fc.property(
    fc.nat(),
    fc.nat(),
    fc.option(fc.nat()),
    (if_nullish, if_nonnull, $) =>
      assertEquals(
        some(if_nullish, () => if_nonnull)($).unwrap(),
        $ == null ? if_nullish : if_nonnull,
      ),
  ));
});
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
        await (await save_async(async ($) => {
          if (error) throw thrown;
          return $;
        }, async (thrown) => Number(thrown) + caught)($)).unwrap_async(),
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
