import { assert, assertEquals, assertStrictEquals } from "@std/assert";
import { assertType, type IsExact, type IsNever } from "@std/testing/types";
import {
  exec,
  fail,
  join,
  type No,
  type Ok,
  pass,
  safe,
  some,
  type Yieldable,
} from "./mod.ts";

const S0 = Symbol("S0");
Deno.test("fail() creates a failure", () => {
  const no = fail(S0);
  assertType<IsExact<typeof no, Yieldable<typeof S0, never>>>(true);
  assertEquals(no.state, false);
  assertType<IsExact<typeof no.value, No<typeof no>>>(true);
  assertEquals(no.value, S0);
});
Deno.test("pass() creates a success", () => {
  const ok = pass(S0);
  assertType<IsExact<typeof ok, Yieldable<never, typeof S0>>>(true);
  assertEquals(ok.state, true);
  assertType<IsExact<typeof ok.value, Ok<typeof ok>>>(true);
  assertEquals(ok.value, S0);
});
Deno.test("some() creates a failure or success", () => {
  for (const $ of [false, true]) {
    const or = some($);
    if (or.state) assertType<IsExact<typeof or.value, true>>(true);
    else assertType<IsExact<typeof or.value, false>>(true);
    assertEquals(or.value, $);
  }
});
Deno.test("some() coerces all falsy values", () => {
  for (const $ of [undefined, null, false, 0, 0n, ""] as const) {
    const or = some($);
    assertType<IsNever<Ok<typeof or>>>(true);
    assertEquals(or.state, false);
    assertEquals(or.value, $);
  }
});
const no = fail(S0), no0 = no[Symbol.iterator]();
const ok = pass(S0), ok0 = ok[Symbol.iterator]();
Deno.test("result[Symbol.iterator]() yields itself", () => {
  const no1 = no0.next();
  const ok1 = ok0.next();
  assertType<IsExact<typeof no1, IteratorResult<typeof no, never>>>(true);
  assertType<IsExact<typeof ok1, IteratorResult<typeof ok, typeof S0>>>(true);
  assert(!no1.done);
  assert(!ok1.done);
  assertType<IsExact<typeof no1.value, Yieldable<typeof S0, never>>>(true);
  assertType<IsExact<typeof ok1.value, Yieldable<never, typeof S0>>>(true);
  assertStrictEquals(no1.value, no);
  assertStrictEquals(ok1.value, ok);
});
Deno.test("result[Symbol.iterator]() returns passed-in argument", () => {
  const no2 = no0.next();
  const ok2 = ok0.next(ok.value);
  assertType<IsExact<typeof no2, IteratorResult<typeof no, never>>>(true);
  assertType<IsExact<typeof ok2, IteratorResult<typeof ok, typeof S0>>>(true);
  assert(no2.done);
  assert(ok2.done);
  assertType<IsExact<typeof no2.value, Ok<typeof no>>>(true);
  assertType<IsExact<typeof ok2.value, Ok<typeof ok>>>(true);
  assertStrictEquals(no2.value, undefined);
  assertStrictEquals(ok2.value, S0);
});
Deno.test("join() aggregates", () => {
  for (const one of [some(false), some(true)]) {
    for (const two of [some(false), some(true)]) {
      const result = join([one, two]);
      if (result.state) {
        assert(one.state);
        assert(two.state);
        assertEquals(result.value, [true, true]);
      } else if (one.state) {
        assert(!two.state);
        assertEquals(result.value, [pass(true), fail(false)]);
      } else assertEquals(result.value, [fail(false), some(two.state)]);
    }
  }
});
Deno.test("safe() try-catches", async () => {
  for (const $ of [false, true]) {
    const unsafe = (ok: boolean) => {
      if (ok) return ok;
      throw ok;
    };
    const result1 = safe(unsafe)($);
    assertType<IsExact<typeof result1, Yieldable<Error, true>>>(true);
    if ($) assert(result1.state), assertEquals(result1.value, $);
    else assert(!result1.state), assertEquals(result1.value.cause, $);
    const result2 = safe(unsafe, (error) => error.cause)($);
    assertType<IsExact<typeof result2, Yieldable<unknown, true>>>(true);
    assertEquals(result2.state, result2.value);
    assertEquals(result2.value, $);
  }
  for (const $ of [false, true]) {
    const unsafe = async (ok: boolean) => {
      if (ok) return await Promise.resolve(ok);
      throw ok;
    };
    const result1 = safe(unsafe)($);
    assertType<IsExact<typeof result1, Promise<Yieldable<Error, true>>>>(
      true,
    );
    await result1.then(({ state, value }) => {
      if ($) assert(state), assertEquals(value, $);
      else assert(!state), assertEquals(value.cause, $);
    });
    for (
      const or of [
        (error: Error) => error.cause,
        async (error: Error) => await Promise.resolve(error.cause),
      ]
    ) {
      const result2 = safe(unsafe, or)($);
      assertType<IsExact<typeof result2, Promise<Yieldable<unknown, true>>>>(
        true,
      );
      await result2.then(({ state, value }) => {
        assertEquals(state, value);
        assertEquals(value, $);
      });
    }
  }
});
Deno.test("exec() runs a block", async () => {
  for (const $ of [false, true]) {
    const result = exec(function* ($: boolean) {
      return yield* some($);
    })($);
    assertType<IsExact<typeof result, Yieldable<false, true>>>(true);
    assertEquals(result.state, $);
    assertEquals(result.value, $);
  }
  for (const $ of [false, true]) {
    const result = exec(async function* ($: boolean) {
      return await Promise.resolve(yield* some($));
    })($);
    assertType<IsExact<typeof result, Promise<Yieldable<false, true>>>>(true);
    await result.then(({ state, value }) => {
      assertEquals(state, $);
      assertEquals(value, $);
    });
  }
});
