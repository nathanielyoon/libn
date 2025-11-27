import {
  assertEquals,
  assertInstanceOf,
  assertRejects,
  assertThrows,
  fail,
} from "@std/assert";
import { type } from "@libn/types";
import { define, type Result, wait, wrap } from "./mod.ts";

Deno.test("wrap : local", () => {
  assertEquals(
    type<Result<0, { 1: 1 }>>()(wrap(define<{ 1: 1 }>(), () => {
      return 0;
    })),
    { error: null, value: 0 },
  );
  const tag = Symbol("tag");
  assertEquals(
    type<Result<0, { [tag]: typeof tag }>>()(
      wrap(define<{ [tag]: typeof tag }>(), (no) => {
        no(tag, tag);
        return 0;
      }),
    ),
    { error: tag, value: tag },
  );
});
Deno.test("wrap : nested", () => {
  assertEquals(
    type<Result<0, { "1": 1 }>>()(wrap(define<{ "1": 1 }>(), (no) => {
      type<Result<2, { 3: 3 }>>()(
        wrap(define<{ 3: 3 }>(), () => {
          no("1", 1);
          return 2;
        }),
      );
      fail();
      return 0;
    })),
    { error: "1", value: 1 },
  );
  assertEquals(
    type<Result<0, { 1: 1 }>>()(wrap(define<{ 1: 1 }>(), () => {
      assertEquals(
        type<Result<2, { 3: 3 }>>()(wrap(define<{ 3: 3 }>(), (no) => {
          no(3, 3);
          return 2;
        })),
        { error: 3, value: 3 },
      );
      return 0;
    })),
    { error: null, value: 0 },
  );
});
Deno.test("wrap : error", () => {
  assertThrows(() =>
    wrap(define(), () => {
      // deno-lint-ignore no-throw-literal
      throw null;
    })
  );
  assertThrows(() =>
    wrap(define(), () => {
      throw Error();
    }), Error);
  const value = Error();
  assertEquals(
    type<Result<never, {}, "error">>()(wrap(define(), () => {
      throw value;
    }, "error")),
    { error: "error", value },
  );
});

const assertResolves = async <A>(actual: Promise<A>, expected: A) => {
  assertInstanceOf(actual, Promise);
  assertEquals(await actual, expected);
};
Deno.test("wait : local", async () => {
  await assertResolves(
    type<Promise<Result<0, { 1: 1 }>>>()(
      wait(define<{ 1: 1 }>(), () => {
        return 0;
      }),
    ),
    { error: null, value: 0 },
  );
  const tag = Symbol("tag");
  await assertResolves(
    type<Promise<Result<0, { [tag]: typeof tag }>>>()(
      wait(define<{ [tag]: typeof tag }>(), async (no) => {
        no(tag, tag);
        return await Promise.resolve(0);
      }),
    ),
    { error: tag, value: tag },
  );
});
Deno.test("wait : nested", async () => {
  await assertResolves(
    type<Promise<Result<0, { "1": 1 }, "error">>>()(
      wait(define<{ "1": 1 }>(), async (no) => {
        await type<Promise<Result<2, { 3: 3 }>>>()(
          wait(define<{ 3: 3 }>(), async () => {
            no("1", 1);
            return await Promise.resolve(2);
          }),
        );
        fail();
        return await Promise.resolve(0);
      }, "error"),
    ),
    { error: "1", value: 1 },
  );
  await assertResolves(
    type<Promise<Result<0, { 1: 1 }>>>()(wait(define<{ 1: 1 }>(), async () => {
      await assertResolves(
        type<Promise<Result<2, { 3: 3 }>>>()(
          wait(define<{ 3: 3 }>(), async (no) => {
            no(3, 3);
            return await Promise.resolve(2);
          }),
        ),
        { error: 3, value: 3 },
      );
      return await Promise.resolve(0);
    })),
    { error: null, value: 0 },
  );
});
Deno.test("wait : error", async () => {
  await assertRejects(() =>
    wait(define(), () => {
      // deno-lint-ignore no-throw-literal
      throw null;
    })
  );
  await assertRejects(() =>
    wait(define(), async () => {
      throw await Promise.resolve(Error());
    }), Error);
  const value = Error();
  await assertResolves(
    type<Promise<Result<never, {}, "error">>>()(wait(define(), () => {
      throw value;
    }, "error")),
    { error: "error", value },
  );
});
