import { type } from "@libn/json/lib";
import {
  assert,
  assertEquals,
  assertStrictEquals,
  assertThrows,
} from "@std/assert";
import {
  exec,
  fail,
  join,
  type No,
  type Ok,
  open,
  pass,
  safe,
  some,
  type Yieldable,
} from "@libn/result";

const S0 = Symbol("S0");
Deno.test("fail() creates a failure", () => {
  const no = fail(S0);
  assertEquals(type<Yieldable<typeof S0, never>>()(no).state, false);
  assertEquals(type<No<typeof no>>()(no.value), S0);
});
Deno.test("pass() creates a success", () => {
  const ok = pass(S0);
  assertEquals(type<Yieldable<never, typeof S0>>()(ok).state, true);
  assertEquals(type<Ok<typeof ok>>()(ok.value), S0);
});
Deno.test("open() unwraps", () => {
  for (const $ of [pass(S0), fail(S0)]) assertEquals(type(S0)(open($)), S0);
});
Deno.test("open() unwraps a success", () => {
  assertThrows(() => open(fail(S0), true));
  assertEquals(type(S0)(open(pass(S0), true)), S0);
});
Deno.test("open() unwraps a failure", () => {
  assertEquals(type(S0)(open(fail(S0), false)), S0);
  assertThrows(() => open(pass(S0), false));
});
Deno.test("some() creates a failure or success", () => {
  for (const $ of [false, true]) {
    const or = some($);
    if (or.state) assertEquals(type(true)(or.value), $);
    else assertEquals(type(false)(or.value), $);
  }
});
Deno.test("some() coerces all falsy values", () => {
  for (const $ of [undefined, null, false, 0, 0n, ""] as const) {
    const or = some($);
    or.state && type<Ok<typeof or>>()(or.value); // never
    assertEquals(or.state, false);
    assertEquals(or.value, $);
  }
});
const no = fail(S0), no0 = no[Symbol.iterator]();
const ok = pass(S0), ok0 = ok[Symbol.iterator]();
Deno.test("result[Symbol.iterator]() yields itself", () => {
  const no1 = type<IteratorResult<typeof no, never>>()(no0.next());
  const ok1 = type<IteratorResult<typeof ok, typeof S0>>()(ok0.next());
  assert(!no1.done), assert(!ok1.done);
  assertStrictEquals(type<Yieldable<typeof S0, never>>()(no1.value), no);
  assertStrictEquals(type<Yieldable<never, typeof S0>>()(ok1.value), ok);
});
Deno.test("result[Symbol.iterator]() returns passed-in argument", () => {
  const no2 = type<IteratorResult<typeof no, never>>()(no0.next());
  const ok2 = type<IteratorResult<typeof ok, typeof S0>>()(ok0.next(ok.value));
  assert(no2.done), assert(ok2.done);
  assertStrictEquals(type<Ok<typeof no>>()(no2.value), undefined);
  assertStrictEquals(type<Ok<typeof ok>>()(ok2.value), S0);
});
Deno.test("join() aggregates", () => {
  for (const one of [some(false), some(true)]) {
    for (const two of [some(false), some(true)]) {
      const result = join([one, two]);
      if (result.state) {
        assert(one.state), assert(two.state);
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
    const result1 = type<Yieldable<Error, true>>()(safe(unsafe)($));
    if ($) assert(result1.state), assertEquals(result1.value, $);
    else assert(!result1.state), assertEquals(result1.value.cause, $);
    const result2 = type<Yieldable<unknown, true>>()(
      safe(unsafe, (error) => error.cause)($),
    );
    assertEquals(result2.state, result2.value);
    assertEquals(result2.value, $);
  }
  for (const $ of [false, true]) {
    const unsafe = async (ok: boolean) => {
      if (ok) return await Promise.resolve(ok);
      throw ok;
    };
    await type<Promise<Yieldable<Error, true>>>()(safe(unsafe)($)).then(
      ({ state, value }) => {
        if ($) assert(state), assertEquals(value, $);
        else assert(!state), assertEquals(value.cause, $);
      },
    );
    for (
      const or of [
        (error: Error) => error.cause,
        async (error: Error) => await Promise.resolve(error.cause),
      ]
    ) {
      await type<Promise<Yieldable<unknown, true>>>()(safe(unsafe, or)($)).then(
        ({ state, value }) => {
          assertEquals(state, value);
          assertEquals(value, $);
        },
      );
    }
  }
});
Deno.test("exec() runs a block", async () => {
  for (const $ of [false, true]) {
    const result = type<Yieldable<false, true>>()(
      exec(function* ($: boolean) {
        return yield* some($);
      })($),
    );
    assertEquals(result.state, $);
    assertEquals(result.value, $);
  }
  for (const $ of [false, true]) {
    await type<Promise<Yieldable<false, true>>>()(
      exec(async function* ($: boolean) {
        return await Promise.resolve(yield* some($));
      })($),
    ).then(({ state, value }) => {
      assertEquals(state, $);
      assertEquals(value, $);
    });
  }
});
