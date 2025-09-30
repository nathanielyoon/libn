import { assertEquals } from "@std/assert";
import fc from "fast-check";
import { fc_assert } from "@libn/lib";
import { no, ok } from "../src/or.ts";
import {
  drop,
  each,
  each_async,
  exec,
  exec_async,
  save,
  save_async,
  some,
} from "../src/wrap.ts";
import { fc_or } from "./common.ts";

Deno.test("some :: non-nullable", () =>
  fc_assert(
    fc.option(fc.nat()),
    fc.option(fc.nat()),
  )(($, if_nullish) =>
    assertEquals(some($, if_nullish).unwrap(), $ == null ? if_nullish : $)
  ));
Deno.test("drop :: predicate", () =>
  fc_assert(
    fc.boolean(),
    fc.nat(),
  )((keep, $) => assertEquals(drop(() => !keep)($).unwrap(), keep ? $ : true)));
Deno.test("save/save_async :: try-catch", async () => {
  fc_assert(fc.boolean(), fc.nat(), fc.nat())((error, thrown, $) =>
    assertEquals(
      save(($) => {
        if (error) throw thrown;
        return $;
      })($).fmap(($) => $, ($) => $.cause).unwrap(),
      error ? thrown : $,
    )
  );
  fc_assert(fc.boolean(), fc.nat(), fc.nat(), fc.nat())(
    (error, thrown, caught, $) =>
      assertEquals(
        save(($) => {
          if (error) throw thrown;
          return $;
        }, (thrown) => Number(thrown) + caught)($).unwrap(),
        error ? thrown + caught : $,
      ),
  );
  await fc_assert(fc.boolean(), fc.nat(), fc.nat())(
    async (error, thrown, $) =>
      assertEquals(
        await (await save_async(($) => {
          if (error) throw thrown;
          return $;
        })($)).fmap(($) => $, ($) => $.cause).unwrap_async(),
        error ? thrown : $,
      ),
    { async: true },
  );
  await fc_assert(fc.boolean(), fc.nat(), fc.nat(), fc.nat())(
    async (error, thrown, caught, $) =>
      assertEquals(
        await (await save_async(($) => {
          if (error) throw thrown;
          return Promise.resolve($);
        }, ($) => Promise.resolve(Number($) + caught))($)).unwrap_async(),
        error ? thrown + caught : $,
      ),
    { async: true },
  );
});
Deno.test("exec/exec_async :: do", async () => {
  fc_assert(
    fc.tuple(fc.boolean(), fc.nat()),
    fc.tuple(fc.boolean(), fc.nat()),
    fc.nat(),
  )((one, two, $) =>
    assertEquals(
      exec(function* ($: number) {
        const a = yield* one[0] ? no(one[1]) : ok(one[1]);
        const b = yield* two[0] ? no(two[1]) : ok(two[1]);
        return $ + a + b;
      })($).unwrap(),
      one[0] ? one[1] : two[0] ? two[1] : $ + one[1] + two[1],
    )
  );
  await fc_assert(
    fc.tuple(fc.boolean(), fc.nat()),
    fc.tuple(fc.boolean(), fc.nat()),
    fc.nat(),
  )(async (one, two, $) =>
    assertEquals(
      await (await exec_async(async function* ($: number) {
        const a = yield* one[0] ? no(one[1]) : ok(one[1]);
        const b = yield* two[0] ? no(two[1]) : ok(two[1]);
        return $ + a + b;
      })($)).unwrap_async(),
      one[0] ? one[1] : two[0] ? two[1] : $ + one[1] + two[1],
    ), { async: true });
});
Deno.test("wrap/wrap_async :: all", async () => {
  fc_assert(fc_or, fc_or)((one, two) =>
    assertEquals<any>(
      each([one, two]),
      one.result.state && two.result.state
        ? ok([one.unwrap(), two.unwrap()])
        : no([one.result, two.result]),
    )
  );
  await fc_assert(
    fc_or.map(($) => $.fmap_async(($) => Promise.resolve(!$))),
    fc_or.map(($) => $.fmap_async(($) => Promise.resolve(!$))),
  )(async (one, two) =>
    assertEquals<any>(
      await each_async([one, two]),
      (await one.result_async).state && (await two.result_async).state
        ? ok([await one.unwrap_async(), await two.unwrap_async()])
        : no([await one.result_async, await two.result_async]),
    ), { async: true });
});
