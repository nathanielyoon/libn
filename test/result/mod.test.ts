import { as, type Result, wait, wrap } from "@libn/result";
import { assertEquals, assertRejects, assertThrows, fail } from "@std/assert";
import { type } from "../test.ts";

Deno.test("wrap : string key", () => {
  type Union = { fail: 0 };
  assertEquals(
    type<Result<never, Union>>()(wrap(as<Union>(), (no) => no("fail", 0))),
    { error: "fail", value: 0 },
  );
});
Deno.test("wrap : number key", () => {
  type Union = { 123: 0 };
  assertEquals(
    type<Result<never, Union>>()(wrap(as<Union>(), (no) => no(123, 0))),
    { error: 123, value: 0 },
  );
});
Deno.test("wrap : symbol key", () => {
  const tag = Symbol("tag");
  type Union = { [tag]: 0 };
  assertEquals(
    type<Result<never, Union>>()(wrap(as<Union>(), (no) => no(tag, 0))),
    { error: tag, value: 0 },
  );
});
Deno.test("wrap : other throws", () => {
  assertThrows(() =>
    wrap(as(), () => {
      throw Error();
    }), Error);
  assertThrows(() =>
    wrap(as(), () => {
      throw null;
    })
  );
});
Deno.test("wrap : nesting", () => {
  assertEquals(
    type<Result<0, { 1: 1 }>>()(wrap(as<{ 1: 1 }>(), (outer) => {
      type<Result<2, { 3: 3 }>>()(wrap(as<{ 3: 3 }>(), (_inner) => {
        outer(1, 1);
        return 2;
      }));
      return fail(), 0;
    })),
    { error: 1, value: 1 },
  );
  assertEquals(
    type<Result<0, { 1: 1 }>>()(wrap(as<{ 1: 1 }>(), (_outer) => {
      assertEquals(
        type<Result<2, { 3: 3 }>>()(wrap(as<{ 3: 3 }>(), (inner) => {
          inner(3, 3);
          return 2;
        })),
        { error: 3, value: 3 },
      );
      return 0;
    })),
    { error: null, value: 0 },
  );
});

Deno.test("wait : string key", async () => {
  type Union = { fail: 0 };
  assertEquals(
    await type<Promise<Result<never, Union>>>()(
      wait(as<Union>(), async (no) => await Promise.resolve(no("fail", 0))),
    ),
    { error: "fail", value: 0 },
  );
});
Deno.test("wait : number key", async () => {
  type Union = { 123: 0 };
  assertEquals(
    await type<Promise<Result<never, Union>>>()(
      wait(as<Union>(), async (no) => await Promise.resolve(no(123, 0))),
    ),
    { error: 123, value: 0 },
  );
});
Deno.test("wait : number key", async () => {
  const tag = Symbol("tag");
  type Union = { [tag]: 0 };
  assertEquals(
    await type<Promise<Result<never, Union>>>()(
      wait(as<Union>(), async (no) => await Promise.resolve(no(tag, 0))),
    ),
    { error: tag, value: 0 },
  );
});
Deno.test("wait : other throws", () => {
  assertRejects(() =>
    wait(as(), async () => {
      throw await Promise.resolve(Error());
    }), Error);
  assertRejects(() =>
    wait(as(), async () => {
      throw await Promise.resolve(null);
    })
  );
});
Deno.test("wait : nesting", async () => {
  assertEquals(
    await type<Promise<Result<0, { 1: 1 }>>>()(
      wait(as<{ 1: 1 }>(), async (outer) => {
        await type<Promise<Result<2, { 3: 3 }>>>()(
          wait(as<{ 3: 3 }>(), async (_inner) => {
            outer(1, 1);
            return await Promise.resolve(2);
          }),
        );
        return fail(), await Promise.resolve(0);
      }),
    ),
    { error: 1, value: 1 },
  );
  assertEquals(
    await type<Promise<Result<0, { 1: 1 }>>>()(
      wait(as<{ 1: 1 }>(), async (_outer) => {
        assertEquals(
          await type<Promise<Result<2, { 3: 3 }>>>()(
            wait(as<{ 3: 3 }>(), async (inner) => {
              inner(3, 3);
              return await Promise.resolve(2);
            }),
          ),
          { error: 3, value: 3 },
        );
        return await Promise.resolve(0);
      }),
    ),
    { error: null, value: 0 },
  );
});
