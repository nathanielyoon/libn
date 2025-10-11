import { assertType, type IsExact } from "@std/testing/types";
import { expect } from "@std/expect/expect";
import fc from "fast-check";
import { type Falsy, type No, no, type Ok, ok, type Or, or } from "@libn/fp/or";
import { type Both, Result, type Sync } from "@libn/fp/result";
import { drop, exec, join, safe, some } from "@libn/fp/wrap";

const _1 = Symbol("1"), _2 = Symbol("2");
type _1 = typeof _1;
type _2 = typeof _2;
const fcFalsy = fc.constantFrom<Falsy>(undefined, null, false, 0, 0n, "");
Deno.test("no() wraps a value and sets state to false", () => {
  const union = no(_1);
  assertType<IsExact<typeof union, Or<_1, never>>>(true);
  assertType<IsExact<typeof union.value, No<Or<_1, never>>>>(true);
  expect(union.state).toBe(false);
  expect(union.value).toBe(_1);
});
Deno.test("ok() wraps a value and sets state to true", () => {
  const union = ok(_2);
  assertType<IsExact<typeof union, Or<never, _2>>>(true);
  assertType<IsExact<typeof union.value, Ok<Or<never, _2>>>>(true);
  expect(union.state).toBe(true);
  expect(union.value).toBe(_2);
});
Deno.test("or() wraps falsy values", () =>
  fc.assert(fc.property(fcFalsy, (falsy) => {
    const union = or(falsy);
    assertType<IsExact<typeof union, Or<Falsy, never>>>(true);
    assertType<IsExact<typeof union.value, No<typeof union>>>(true);
    expect(union).toStrictEqual({ state: false, value: falsy });
  })));
Deno.test("or() wraps truthy values", () =>
  fc.assert(fc.property(fc.anything().filter(Boolean), (truthy) => {
    const union = or(truthy);
    assertType<IsExact<typeof union, Or<Falsy, unknown>>>(true);
    assertType<IsExact<typeof union.value, Ok<typeof union>>>(true);
    expect(union).toStrictEqual({ state: true, value: truthy });
  })));
const fcOrA = fc.constantFrom<Promise<Or<_1, _2>>>(
  Promise.resolve({ state: false, value: _1 }),
  Promise.resolve({ state: true, value: _2 }),
);
const fcOrS = fc.constantFrom<Or<_1, _2>>(
  { state: false, value: _1 },
  { state: true, value: _2 },
);
const fcOrB = fc.oneof(fcOrA, fcOrS);
Deno.test("Result.no() wraps an async value in an async result", async () => {
  const result = Result.no(Promise.resolve(_1));
  assertType<IsExact<typeof result, Result<_1, never, true>>>(true);
  await expect(result.unwrap()).resolves.toBe(_1);
});
Deno.test("Result.no() wraps a sync value in a sync result", () => {
  const result = Result.no(_1);
  assertType<IsExact<typeof result, Result<_1, never, false>>>(true);
  expect(result.unwrap()).toBe(_1);
});
Deno.test("Result.no() wraps a value in an result", () =>
  fc.assert(fc.asyncProperty(
    fc.constantFrom(Promise.resolve(_1), _1),
    async ($) => {
      const result = Result.no($);
      assertType<IsExact<typeof result, Result<_1, never, boolean>>>(true);
      if ($ instanceof Promise) await expect(result.unwrap()).resolves.toBe(_1);
      else expect(result.unwrap()).toBe(_1);
    },
  )));
Deno.test("Result.ok() wraps a value in a result", async () => {
  const result = Result.ok(Promise.resolve(_2));
  assertType<IsExact<typeof result, Result<never, _2, true>>>(true);
  await expect(result.unwrap()).resolves.toBe(_2);
});
Deno.test("Result.ok() wraps a sync value in a sync result", () => {
  const result = Result.ok(_2);
  assertType<IsExact<typeof result, Result<never, _2, false>>>(true);
  expect(result.unwrap()).toBe(_2);
});
Deno.test("Result.ok() wraps a value in a result", () =>
  fc.assert(fc.asyncProperty(
    fc.constantFrom(Promise.resolve(_2), _2),
    async ($) => {
      const result = Result.ok($);
      assertType<IsExact<typeof result, Result<never, _2, boolean>>>(true);
      if ($ instanceof Promise) await expect(result.unwrap()).resolves.toBe(_2);
      else expect(result.unwrap()).toBe(_2);
    },
  )));
Deno.test("Result.or() wraps an async union in an async result", () =>
  fc.assert(fc.asyncProperty(fcOrA, async ($) => {
    const result = Result.or($);
    assertType<IsExact<typeof result, Result<_1, _2, true>>>(true);
    await expect(result.either).resolves.toStrictEqual(await $);
  })));
Deno.test("Result.or() wraps a sync union in a sync result", () =>
  fc.assert(fc.property(fcOrS, ($) => {
    const result = Result.or($);
    assertType<IsExact<typeof result, Result<_1, _2, false>>>(true);
    expect(result.either).toStrictEqual($);
  })));
Deno.test("Result.or() wraps a union in a result", () =>
  fc.assert(fc.asyncProperty(fcOrB, async ($) => {
    const result = Result.or($);
    assertType<IsExact<typeof result, Result<_1, _2, boolean>>>(true);
    if ($ instanceof Promise) {
      await expect(result.either).resolves.toStrictEqual(await $);
    } else expect(result.either).toStrictEqual($);
  })));
Deno.test("result[Symbol.iterator]() yields itself", () =>
  fc.assert(fc.property(fcOrB, ($) => {
    const result = Result.or($);
    const next = result[Symbol.iterator]().next();
    assertType<IsExact<typeof next, IteratorResult<typeof result, _2>>>(true);
    expect(next.done).toBe(false);
    expect(next.value).toBe(result);
  })));
const overload = async <A, B, C, D>(
  sync1: A,
  sync2: B,
  or: Both<Or<C, D>>,
  both1: A,
  both2: B,
  async: Result<C, D, true>[],
  sync: Result<C, D, boolean>[],
  both: Result<C, D, boolean>[],
) => {
  for (const $ of async) {
    await expect($.either).resolves.toStrictEqual(await or);
  }
  const sync10 = expect(sync[0].either), sync11 = expect(sync[1].either);
  const both10 = expect(both[0].either), both11 = expect(both[1].either);
  if (or instanceof Promise) {
    for (const $ of [sync10, sync11, both10, both11]) {
      await $.resolves.toStrictEqual(await or);
    }
  } else {
    sync10.toStrictEqual(or), sync11.toStrictEqual(or);
    if (both1 !== sync1 && or.state) await both10.resolves.toStrictEqual(or);
    else both10.toStrictEqual(or);
    if (both1 !== sync1 && or.state || both2 !== sync2 && !or.state) {
      await both11.resolves.toStrictEqual(or);
    } else both11.toStrictEqual(or);
  }
};
const fmapAsync = <A>($: A) => Promise.resolve($);
const fmapSync = <A>($: A) => $;
const fcFmapBoth = fc.constantFrom<<A>($: A) => Both<A>>(fmapAsync, fmapSync);
Deno.test("result.fmap() applies functions to an async result", () =>
  fc.assert(fc.asyncProperty(fcOrA, fcFmapBoth, async ($, fmap) => {
    const base = Result.or($);
    assertType<IsExact<typeof base, Result<_1, _2, true>>>(true);
    const async = [base.fmap(fmapAsync, fmapAsync)];
    const sync = [base.fmap(fmapSync), base.fmap(fmapSync, fmapSync)];
    const both = [base.fmap(fmap), base.fmap(fmap, fmap)];
    assertType<IsExact<typeof async[number], Result<_1, _2, true>>>(true);
    assertType<IsExact<typeof sync[number], typeof base>>(true);
    assertType<IsExact<typeof both[number], Result<_1, _2, true>>>(true);
    await overload(fmapSync, fmapSync, $, fmap, fmap, async, sync, both);
  })));
Deno.test("result.fmap() applies functions to a sync result", () =>
  fc.assert(fc.asyncProperty(fcOrS, fcFmapBoth, async ($, fmap) => {
    const base = Result.or($);
    assertType<IsExact<typeof base, Result<_1, _2, false>>>(true);
    const async = [base.fmap(fmapAsync, fmapAsync)];
    const sync = [base.fmap(fmapSync), base.fmap(fmapSync, fmapSync)];
    const both = [base.fmap(fmap), base.fmap(fmap, fmap)];
    assertType<IsExact<typeof async[number], Result<_1, _2, true>>>(true);
    assertType<IsExact<typeof sync[number], typeof base>>(true);
    assertType<IsExact<typeof both[number], Result<_1, _2, boolean>>>(true);
    await overload(fmapSync, fmapSync, $, fmap, fmap, async, sync, both);
  })));
Deno.test("result.fmap() applies functions to a result", () =>
  fc.assert(fc.asyncProperty(fcOrB, fcFmapBoth, async ($, fmap) => {
    const base = Result.or($);
    assertType<IsExact<typeof base, Result<_1, _2, boolean>>>(true);
    const async = [base.fmap(fmapAsync, fmapAsync)];
    const sync = [base.fmap(fmapSync), base.fmap(fmapSync, fmapSync)];
    const both = [base.fmap(fmap), base.fmap(fmap, fmap)];
    assertType<IsExact<typeof async[number], Result<_1, _2, true>>>(true);
    assertType<IsExact<typeof sync[number], typeof base>>(true);
    assertType<IsExact<typeof both[number], Result<_1, _2, boolean>>>(true);
    await overload(fmapSync, fmapSync, $, fmap, fmap, async, sync, both);
  })));
const okAsync1 = <A>($: A) => Promise.resolve(Result.ok($));
const okAsync2 = <A>($: A) => Result.ok(Promise.resolve($));
const noAsync1 = <A>($: A) => Promise.resolve(Result.no($));
const noAsync2 = <A>($: A) => Result.no(Promise.resolve($));
const okSync = <A>($: Sync<A>) => Result.ok($);
const noSync = <A>($: Sync<A>) => Result.no($);
const fcOkBoth = fc.constantFrom<
  <A>($: Sync<A>) =>
    | Promise<Result<never, A, boolean>>
    | Result<never, A, true>
    | Result<never, A, false>
>(okAsync1, okAsync2, okSync);
const fcNoBoth = fc.constantFrom<
  <A>($: Sync<A>) =>
    | Promise<Result<A, never, boolean>>
    | Result<A, never, true>
    | Result<A, never, false>
>(noAsync1, noAsync2, noSync);
Deno.test("result.bind() chains functions to an async result", () =>
  fc.assert(fc.asyncProperty(fcOrA, fcOkBoth, fcNoBoth, async ($, ok, no) => {
    const base = Result.or($);
    assertType<IsExact<typeof base, Result<_1, _2, true>>>(true);
    const async = [
      base.bind(okAsync1, noAsync1),
      base.bind(okAsync1, noAsync2),
      base.bind(okAsync2, noAsync2),
      base.bind(okAsync2, noAsync2),
    ];
    const sync = [base.bind(okSync), base.bind(okSync, noSync)];
    const both = [base.bind(ok), base.bind(ok, no)];
    assertType<IsExact<typeof async[number], Result<_1, _2, true>>>(true);
    assertType<IsExact<typeof sync[number], typeof base>>(true);
    assertType<IsExact<typeof both[number], Result<_1, _2, true>>>(true);
    await overload(okSync, noSync, $, ok, no, async, sync, both);
  })));
Deno.test("result.bind() chains functions to a sync result", () =>
  fc.assert(fc.asyncProperty(fcOrS, fcOkBoth, fcNoBoth, async ($, ok, no) => {
    const base = Result.or($);
    assertType<IsExact<typeof base, Result<_1, _2, false>>>(true);
    const async = [
      base.bind(okAsync1, noAsync1),
      base.bind(okAsync1, noAsync2),
      base.bind(okAsync2, noAsync2),
      base.bind(okAsync2, noAsync2),
    ];
    const sync = [base.bind(okSync), base.bind(okSync, noSync)];
    const both = [base.bind(ok), base.bind(ok, no)];
    assertType<IsExact<typeof async[number], Result<_1, _2, true>>>(true);
    assertType<IsExact<typeof sync[number], typeof base>>(true);
    assertType<IsExact<typeof both[number], Result<_1, _2, boolean>>>(true);
    await overload(okSync, noSync, $, ok, no, async, sync, both);
  })));
Deno.test("result.bind() chains functions to a result", () =>
  fc.assert(fc.asyncProperty(fcOrB, fcOkBoth, fcNoBoth, async ($, ok, no) => {
    const base = Result.or($);
    assertType<IsExact<typeof base, Result<_1, _2, boolean>>>(true);
    const async = [
      base.bind(okAsync1, noAsync1),
      base.bind(okAsync1, noAsync2),
      base.bind(okAsync2, noAsync2),
      base.bind(okAsync2, noAsync2),
    ];
    const sync = [base.bind(okSync), base.bind(okSync, noSync)];
    const both = [base.bind(ok), base.bind(ok, no)];
    assertType<IsExact<typeof async[number], Result<_1, _2, true>>>(true);
    assertType<IsExact<typeof sync[number], typeof base>>(true);
    assertType<IsExact<typeof both[number], Result<_1, _2, boolean>>>(true);
    await overload(okSync, noSync, $, ok, no, async, sync, both);
  })));
Deno.test("result.either gets an async discriminated union", () =>
  fc.assert(fc.asyncProperty(fcOrA, async ($) => {
    const or = Result.or($).either;
    assertType<IsExact<typeof or, Promise<Or<_1, _2>>>>(true);
    await expect(or).resolves.toStrictEqual(await $);
  })));
Deno.test("result.either gets a sync discriminated union", () =>
  fc.assert(fc.property(fcOrS, ($) => {
    const or = Result.or($).either;
    assertType<IsExact<typeof or, Or<_1, _2>>>(true);
    expect(or).toStrictEqual($);
  })));
Deno.test("result.either gets a discriminated union", () =>
  fc.assert(fc.asyncProperty(fcOrB, async ($) => {
    const or = Result.or($).either;
    assertType<IsExact<typeof or, Both<Or<_1, _2>>>>(true);
    if ($ instanceof Promise) {
      await expect(or).resolves.toStrictEqual(await $);
    } else expect(or).toStrictEqual($);
  })));
const error1 = Error("false", { cause: _1 });
const error2 = Error("true", { cause: _2 });
Deno.test("result.unwrap() gets an async value", () =>
  fc.assert(fc.asyncProperty(fcOrA, async ($) => {
    const result = Result.or($);
    const value = result.unwrap();
    assertType<IsExact<typeof value, Promise<_1 | _2>>>(true);
    await expect(value).resolves.toBe((await $).value);
    const one = result.unwrap(false);
    const two = result.unwrap(true);
    assertType<IsExact<typeof one, Promise<_1>>>(true);
    assertType<IsExact<typeof two, Promise<_2>>>(true);
    if ((await $).state) {
      await expect(one).rejects.toStrictEqual(error2);
      await expect(two).resolves.toBe(_2);
    } else {
      await expect(one).resolves.toBe(_1);
      await expect(two).rejects.toStrictEqual(error1);
    }
  })));
Deno.test("result.unwrap() gets a sync value", () =>
  fc.assert(fc.property(fcOrS, ($) => {
    const result = Result.or($);
    const value = result.unwrap();
    assertType<IsExact<typeof value, _1 | _2>>(true);
    expect(value).toBe($.value);
    if ($.state) {
      expect(() => result.unwrap(false)).toThrow(error2);
      expect(result.unwrap(true)).toBe(_2);
    } else {
      expect(result.unwrap(false)).toBe(_1);
      expect(() => result.unwrap(true)).toThrow(error1);
    }
  })));
Deno.test("result.unwrap() gets a value", () =>
  fc.assert(fc.asyncProperty(fcOrB, async ($) => {
    const result = Result.or($);
    const value = result.unwrap();
    assertType<IsExact<typeof value, Both<_1 | _2>>>(true);
    if ($ instanceof Promise) {
      await expect(value).resolves.toBe((await $).value);
      if ((await $).state) {
        await expect(result.unwrap(false)).rejects.toStrictEqual(error2);
        await expect(result.unwrap(true)).resolves.toBe(_2);
      } else {
        await expect(result.unwrap(false)).resolves.toBe(_1);
        await expect(result.unwrap(true)).rejects.toStrictEqual(error1);
      }
    } else {
      expect(value).toBe($.value);
      if ($.state) {
        expect(() => result.unwrap(false)).toThrow(error2);
        expect(result.unwrap(true)).toBe(_2);
      } else {
        expect(result.unwrap(false)).toBe(_1);
        expect(() => result.unwrap(true)).toThrow(error1);
      }
    }
  })));
Deno.test("pass() passes through", () =>
  fc.assert(fc.property(fc.anything(), ($) => {
    expect($).toBe($);
  })));
Deno.test("some() wraps nullable values", () =>
  fc.assert(fc.property(fc.constantFrom(_2, null, undefined), ($) => {
    const one = some($);
    assertType<IsExact<typeof one, Result<undefined, _2, false>>>(true);
    expect(one.either).toStrictEqual({
      state: Boolean($),
      value: $ ?? undefined,
    });
    const two = some($, _1);
    assertType<IsExact<typeof two, Result<_1, _2, false>>>(true);
    expect(two.either).toStrictEqual({
      state: Boolean($),
      value: $ ?? _1,
    });
  })));
const passAsync = ($: _2): Promise<_2> => Promise.resolve($);
const failAsync = (_: _2): Promise<_2> => Promise.reject(_2);
const ifThrownAsync = (_: _2): Promise<_1> => Promise.resolve(_1);
const passSync = ($: _2): _2 => $;
const failSync = ($: _2): _2 => {
  throw $;
};
const ifThrownSync = (_: _2): _1 => _1;
Deno.test("safe() tries and catches", () =>
  fc.assert(fc.asyncProperty(
    fcOrS.chain(($) =>
      fc.record({
        or: fc.constant($),
        async: fc.constant($.state ? passAsync : failAsync),
        sync: fc.constant($.state ? passSync : failSync),
        ifThrown: fc.constantFrom(ifThrownAsync, ifThrownSync),
      })
    ),
    async ({ or, async, sync, ifThrown }) => {
      const orish = expect.objectContaining({ state: or.state });
      const async0 = safe(async)(_2);
      const async1 = safe(async, ifThrownAsync)(_2);
      const async2 = safe(async, ifThrown)(_2);
      const sync0 = safe(sync)(_2);
      const sync1 = safe(sync, ifThrownSync)(_2);
      const both = safe(sync, ifThrown)(_2);
      assertType<IsExact<typeof async0, Result<Error, _2, true>>>(true);
      assertType<
        IsExact<typeof async1 | typeof async2, Result<_1, _2, true>>
      >(true);
      assertType<IsExact<typeof sync0, Result<Error, _2, false>>>(true);
      assertType<IsExact<typeof sync1, Result<_1, _2, false>>>(true);
      assertType<IsExact<typeof both, Result<_1, _2, boolean>>>(true);
      await expect(async0.either).resolves.toStrictEqual(orish);
      await expect(async1.either).resolves.toStrictEqual(or);
      await expect(async2.either).resolves.toStrictEqual(or);
      expect(sync0.either).toStrictEqual(orish);
      expect(sync1.either).toStrictEqual(or);
      if (!or.state && ifThrown === ifThrownAsync) {
        await expect(both.either).resolves.toStrictEqual(or);
      } else expect(both.either).toStrictEqual(or);
    },
  )));
const each = <A extends (Or | Promise<Or>)[]>(ors: A) =>
  ors.map(($) => Result.or($)) as {
    [B in keyof A]: A[B] extends Promise<Or<infer C, infer D>>
      ? Result<C, D, true>
      : A[B] extends Or<infer C, infer D> ? Result<C, D, false>
      : A[B] extends Both<Or<infer C, infer D>> ? Result<C, D, boolean>
      : never;
  };
Deno.test("join() combines empty list", () => {
  const result = join([]);
  assertType<IsExact<typeof result, Result<never, [], false>>>(true);
  expect(result.either).toStrictEqual({ state: true, value: [] });
});
const every = ($: Or[]) =>
  $.every(({ state }) => state)
    ? { state: true, value: Array($.length).fill(_2) }
    : { state: false, value: $ };
Deno.test("join() combines a tuple of async results into an async result", () =>
  fc.assert(fc.asyncProperty(fc.tuple(fcOrA, fcOrA).map(each), async ($) => {
    const result = join($);
    assertType<
      IsExact<typeof result, Result<[Or<_1, _2>, Or<_1, _2>], [_2, _2], true>>
    >(true);
    await expect(result.either).resolves.toStrictEqual(
      every([await $[0].either, await $[1].either]),
    );
  })));
Deno.test("join() combines a tuple of sync results into a sync result", () =>
  fc.assert(fc.property(fc.tuple(fcOrS, fcOrS).map(each), ($) => {
    const result = join($);
    assertType<
      IsExact<typeof result, Result<[Or<_1, _2>, Or<_1, _2>], [_2, _2], false>>
    >(true);
    expect(result.either).toStrictEqual(every([$[0].either, $[1].either]));
  })));
Deno.test("join() combines a tuple of results into a result", () =>
  fc.assert(fc.asyncProperty(fc.tuple(fcOrB, fcOrB).map(each), async ($) => {
    const result = join($);
    assertType<
      IsExact<
        typeof result,
        Result<[Or<_1, _2>, Or<_1, _2>], [_2, _2], boolean>
      >
    >(true);
    if ($[0].either instanceof Promise || $[1].either instanceof Promise) {
      await expect(result.either).resolves.toStrictEqual(
        every([await $[0].either, await $[1].either]),
      );
    } else {
      expect(result.either).toStrictEqual(every([$[0].either, $[1].either]));
    }
  })));
Deno.test("join() combines a list of async results into an async result", () =>
  fc.assert(fc.asyncProperty(fc.array(fcOrA).map(each), async ($) => {
    const result = join($);
    assertType<IsExact<typeof result, Result<Or<_1, _2>[], _2[], boolean>>>(
      true,
    );
    if ($.length) {
      await expect(result.either).resolves.toStrictEqual(
        every(await Promise.all($.map(({ either }) => either))),
      );
    } else expect(result.either).toStrictEqual({ state: true, value: [] });
  })));
Deno.test("join() combines a list of sync results into a sync result", () =>
  fc.assert(fc.property(fc.array(fcOrS).map(each), ($) => {
    const result = join($);
    assertType<IsExact<typeof result, Result<Or<_1, _2>[], _2[], false>>>(
      true,
    );
    expect(result.either).toStrictEqual(every($.map(({ either }) => either)));
  })));
Deno.test("join() combines a list of results into a result", () =>
  fc.assert(fc.asyncProperty(fc.array(fcOrB).map(each), async ($) => {
    const result = join($);
    assertType<IsExact<typeof result, Result<Or<_1, _2>[], _2[], boolean>>>(
      true,
    );
    if ($.length) {
      const expected = every(await Promise.all($.map(({ either }) => either)));
      if ($.some(({ either }) => either instanceof Promise)) {
        await expect(result.either).resolves.toStrictEqual(expected);
      } else expect(result.either).toStrictEqual(expected);
    } else expect(result.either).toStrictEqual({ state: true, value: [] });
  })));
const guardSync = (falsy: Falsy) => ($: _1 | _2) => $ === _1 ? $ : falsy;
const guardAsync = (falsy: Falsy) => ($: _1 | _2) =>
  Promise.resolve($ === _1 ? $ : falsy);
Deno.test("drop() wraps an async guard", () =>
  fc.assert(fc.asyncProperty(
    fc.constantFrom(_1, _2),
    fcFalsy,
    async (value, falsy) => {
      const result = drop(guardAsync(falsy))(value);
      assertType<IsExact<typeof result, Result<_1, _1 | _2, true>>>(true);
      await expect(result.either).resolves.toStrictEqual(
        { state: value !== _1, value },
      );
    },
  )));
Deno.test("drop() wraps a sync guard", () =>
  fc.assert(fc.property(fc.constantFrom(_1, _2), fcFalsy, (value, falsy) => {
    const result = drop(guardSync(falsy))(value);
    assertType<IsExact<typeof result, Result<_1, _1 | _2, false>>>(true);
    expect(result.either).toStrictEqual({ state: value !== _1, value });
  })));
const execed = (or1: Or, or2: Or) =>
  or1.state && or2.state
    ? { state: true, value: [_2, _2, _2] }
    : { state: false, value: _1 };
Deno.test("exec() runs a block that yields async results", () =>
  fc.assert(fc.asyncProperty(fc.tuple(fcOrA, fcOrA).map(each), async ($) => {
    const either = execed(await $[0].either, await $[1].either);
    const async = exec(async function* (symbol: _2) {
      return [yield* $[0], yield* $[1], symbol] as const;
    })(_2);
    assertType<
      IsExact<typeof async, Promise<Result<_1, readonly [_2, _2, _2], false>>>
    >(true);
    expect(async).toBeInstanceOf(Promise);
    expect((await async).either).toStrictEqual(either);
    const sync = exec(function* (symbol: _2) {
      return [yield* $[0], yield* $[1], symbol] as const;
    })(_2);
    assertType<
      IsExact<typeof sync, Result<_1, readonly [_2, _2, _2], true>>
    >(true);
    expect(sync).not.toBeInstanceOf(Promise);
    await expect(sync.either).resolves.toStrictEqual(either);
  })));
Deno.test("exec() runs a block that yields sync results", () =>
  fc.assert(fc.asyncProperty(fc.tuple(fcOrS, fcOrS).map(each), async ($) => {
    const either = execed($[0].either, $[1].either);
    const async = exec(async function* (symbol: _2) {
      return [yield* $[0], yield* $[1], symbol] as const;
    })(_2);
    assertType<
      IsExact<typeof async, Promise<Result<_1, readonly [_2, _2, _2], false>>>
    >(true);
    expect(async).toBeInstanceOf(Promise);
    expect((await async).either).toStrictEqual(either);
    const sync = exec(function* (symbol: _2) {
      return [yield* $[0], yield* $[1], symbol] as const;
    })(_2);
    assertType<
      IsExact<typeof sync, Result<_1, readonly [_2, _2, _2], false>>
    >(true);
    expect(sync).not.toBeInstanceOf(Promise);
    expect(sync.either).toStrictEqual(either);
  })));
Deno.test("exec() runs a block that yields results", () =>
  fc.assert(fc.asyncProperty(fc.tuple(fcOrB, fcOrB).map(each), async ($) => {
    const either = execed(await $[0].either, await $[1].either);
    const async = exec(async function* (symbol: _2) {
      return [yield* $[0], yield* $[1], symbol] as const;
    })(_2);
    assertType<
      IsExact<typeof async, Promise<Result<_1, readonly [_2, _2, _2], false>>>
    >(true);
    expect(async).toBeInstanceOf(Promise);
    expect((await async).either).toStrictEqual(either);
    const sync = exec(function* (symbol: _2) {
      return [yield* $[0], yield* $[1], symbol] as const;
    })(_2);
    assertType<
      IsExact<typeof sync, Result<_1, readonly [_2, _2, _2], boolean>>
    >(true);
    expect(sync).not.toBeInstanceOf(Promise);
    if (
      $[0].either instanceof Promise ||
      $[0].either.state && $[1].either instanceof Promise
    ) await expect(sync.either).resolves.toStrictEqual(either);
    else expect(sync.either).toStrictEqual(either);
  })));
