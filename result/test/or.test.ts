import { assertEquals, assertRejects, assertThrows } from "@std/assert";
import fc from "fast-check";
import { fc_assert } from "@libn/lib";
import { no, ok, Or, or } from "../src/or.ts";
import { fc_or } from "./common.ts";

Deno.test("ok : pass", () =>
  fc_assert(fc.anything())(($) =>
    assertEquals(ok($).result, { state: true, value: $ })
  ));
Deno.test("no : fail", () =>
  fc_assert(fc.anything())(($) =>
    assertEquals(no($).result, { state: false, value: $ })
  ));
Deno.test("or : pass or fail", () =>
  fc_assert(fc.boolean(), fc.anything())(
    (state, value) =>
      assertEquals(or({ state, value }).result, { state, value }),
  ));
Deno.test("Or : promise", () =>
  fc_assert(fc_or)(async ($) =>
    assertEquals(
      await new Or(null, Promise.resolve($.result)).result_async,
      $.result,
    ), { async: true }));
Deno.test("Or.fmap/Or.fmap_async : apply conditionally", async () => {
  fc_assert(fc_or)(($) => assertEquals($.fmap(($) => !$).unwrap(), false));
  fc_assert(fc_or)(($) =>
    assertEquals($.fmap(($) => $, ($) => !$).unwrap(), true)
  );
  await fc_assert(fc_or)(async ($) =>
    assertEquals(
      await $.fmap_async(($) => Promise.resolve(!$)).unwrap_async(),
      false,
    ), { async: true });
  await fc_assert(fc_or)(async ($) =>
    assertEquals(
      await $.fmap_async(
        ($) => Promise.resolve($),
        ($) => Promise.resolve(!$),
      ).unwrap_async(),
      true,
    ), { async: true });
  await fc_assert(fc_or.map(($) => $.fmap_async(($) => Promise.resolve($))))(
    async ($) =>
      assertEquals(
        await $.fmap(($) => $).unwrap_async(),
        (await $.result_async).state,
      ),
    { async: true },
  );
});
Deno.test("Or.bind/Or.bind_async : map successes", async () => {
  fc_assert(fc_or)(($) => assertEquals($.bind(($) => ok(!$)).unwrap(), false));
  await fc_assert(fc_or)(async ($) =>
    assertEquals(
      await $.bind_async(($) => Promise.resolve(ok(!$))).unwrap_async(),
      false,
    ), { async: true });
  await fc_assert(
    fc_or.map(($) => $.bind_async(($) => Promise.resolve(ok($)))),
  )(async ($) =>
    assertEquals(
      await $.bind(($) => ok($)).unwrap_async(),
      (await $.result_async).state,
    ), { async: true });
});
Deno.test("Or.result/Or.result_async :: discriminated union", async () => {
  fc_assert(fc_or)(($) => assertEquals($.result.state, $.result.value));
  await fc_assert(fc_or)(async ($) => {
    const { state, value } = await $.result_async;
    assertEquals(state, value);
  }, { async: true });
  fc_assert(fc_or.map(($) => $.fmap_async(($) => Promise.resolve($))))(($) =>
    void assertThrows(() => $.result)
  );
});
Deno.test("Or.unwrap/Or.unwrap_async : pass through", async () => {
  fc_assert(fc_or)(($) => assertEquals($.unwrap(), $.result.state));
  fc_assert(fc_or)(($) => void $.unwrap($.result.state));
  fc_assert(fc_or)(($) => void assertThrows(() => $.unwrap(!$.result.state)));
  await fc_assert(fc_or)(
    async ($) => assertEquals(await $.unwrap_async(), $.result.state),
    { async: true },
  );
  await fc_assert(fc_or)(
    async ($) => void await $.unwrap_async($.result.state),
    { async: true },
  );
  await fc_assert(fc_or)(
    async ($) =>
      void await assertRejects(() => $.unwrap_async(!$.result.state)),
    { async: true },
  );
  fc_assert(fc_or.map(($) => $.fmap_async(($) => Promise.resolve($))))(
    ($) => void assertThrows(() => $.unwrap()),
  );
});
