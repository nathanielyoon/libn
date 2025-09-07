import { assertEquals, assertThrows } from "@std/assert";
import fc from "fast-check";
import { fc_check } from "../test.ts";
import { drop, exec, no, ok, save, some } from "./mod.ts";

const fc_or = fc.boolean().map(($) => $ ? ok($) : no($));
Deno.test("fmap applies conditionally", () => {
  fc_check(fc.property(
    fc_or,
    ($) => assertEquals($.fmap(($) => !$).unwrap(), false),
  ));
  fc_check(fc.property(
    fc_or,
    ($) => assertEquals($.fmap(($) => !$, ($) => !$).unwrap(), !$.result.state),
  ));
});
Deno.test("bind only maps successes", () =>
  fc_check(fc.property(
    fc_or,
    ($) => assertEquals($.bind(($) => ok(!$)).unwrap(), false),
  )));
Deno.test("result union discriminates", () =>
  fc_check(
    fc.property(fc_or, ($) => assertEquals($.result.state, $.result.value)),
  ));
Deno.test("unwrap passes through or throws", () => {
  fc_check(fc.property(fc_or, ($) => assertEquals($.unwrap(), $.result.state)));
  fc_check(fc.property(fc_or, ($) => void $.unwrap($.result.state)));
  fc_check(fc.property(
    fc_or,
    ($) => void assertThrows(() => $.unwrap(!$.result.state)),
  ));
});
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
Deno.test("exec returns early", () =>
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
  )));
Deno.test("save try-catches", () => {
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
});
