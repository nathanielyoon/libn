import {
  assertEquals,
  assertInstanceOf,
  assertRejects,
  assertThrows,
  fail,
} from "@std/assert";
import { type } from "@libn/types";
import { as, open, type Result, seal, wait, wrap } from "./mod.ts";

Deno.test("wrap : local", () => {
  for (const value of [false, true]) {
    assertEquals(
      type<Result<true, { fail: false }>>()(wrap(
        as<{ fail: false }>(),
        (no) => value || no("fail", false),
      )),
      { error: value ? null : "fail", value },
    );
    assertEquals(
      type<Result<true, { 0: false }>>()(wrap(
        as<{ 0: false }>(),
        (no) => value || no(0, false),
      )),
      { error: value ? null : 0, value },
    );
    const tag = Symbol("tag");
    assertEquals(
      type<Result<true, { [tag]: false }>>()(wrap(
        as<{ [tag]: false }>(),
        (no) => value || no(tag, false),
      )),
      { error: value ? null : tag, value },
    );
  }
});
Deno.test("wrap : nested", () => {
  assertEquals(
    type<Result<0, { 1: 1 }>>()(wrap(as<{ 1: 1 }>(), (outer) => {
      type<Result<2, { 3: 3 }>>()(wrap(as<{ 3: 3 }>(), (_) => {
        outer(1, 1);
        return 2;
      }));
      return fail(), 0;
    })),
    { error: 1, value: 1 },
  );
  assertEquals(
    type<Result<0, { 1: 1 }>>()(wrap(as<{ 1: 1 }>(), (_) => {
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
Deno.test("wrap : other", () => {
  assertThrows(() =>
    wrap(as(), () => {
      throw Error();
    }), Error);
  assertThrows(() =>
    wrap(as(), () => { // deno-lint-ignore no-throw-literal
      throw null;
    })
  );
});

const assertResolves = async <A>(actual: Promise<A>, expected: A) => {
  assertInstanceOf(actual, Promise);
  assertEquals(await actual, expected);
};
Deno.test("wait : local", async () => {
  for (const value of [false, true]) {
    await assertResolves(
      type<Promise<Result<true, { fail: false }>>>()(wait(
        as<{ fail: false }>(),
        (no) => value || no("fail", false),
      )),
      { error: value ? null : "fail", value },
    );
    await assertResolves(
      type<Promise<Result<true, { 0: false }>>>()(wait(
        as<{ 0: false }>(),
        (no) => value || no(0, false),
      )),
      { error: value ? null : 0, value },
    );
    const tag = Symbol("tag");
    await assertResolves(
      type<Promise<Result<true, { [tag]: false }>>>()(wait(
        as<{ [tag]: false }>(),
        (no) => value || no(tag, false),
      )),
      { error: value ? null : tag, value },
    );
  }
});
Deno.test("wait : nested", async () => {
  await assertResolves(
    type<Promise<Result<0, { 1: 1 }>>>()(wait(as<{ 1: 1 }>(), async (outer) => {
      await type<Promise<Result<2, { 3: 3 }>>>()(wait(as<{ 3: 3 }>(), (_) => {
        outer(1, 1);
        return 2;
      }));
      return fail(), Promise.resolve(0);
    })),
    { error: 1, value: 1 },
  );
  await assertResolves(
    type<Promise<Result<0, { 1: 1 }>>>()(wait(as<{ 1: 1 }>(), async (_) => {
      await assertResolves(
        type<Promise<Result<2, { 3: 3 }>>>()(wait(as<{ 3: 3 }>(), (inner) => {
          inner(3, 3);
          return 2;
        })),
        { error: 3, value: 3 },
      );
      return Promise.resolve(0);
    })),
    { error: null, value: 0 },
  );
});
Deno.test("wait : other", async () => {
  await assertRejects(() =>
    wait(as(), () => {
      throw Error();
    }), Error);
  await assertRejects(() =>
    wait(as(), () => { // deno-lint-ignore no-throw-literal
      throw null;
    })
  );
});

Deno.test("seal : error", () => {
  for (const pass of [false, true]) {
    const value = Error();
    assertEquals(
      type<Result<0, { Error: Error }>>()(
        seal(<const A>($: A) => {
          if (pass) return $;
          throw value;
        })(0),
      ),
      pass ? { error: null, value: 0 } : { error: "Error", value },
    );
    assertEquals(
      type<Result<1, { error: Error }>>()(
        seal(<const A>($: A) => {
          if (pass) return $;
          throw value;
        }, "error")(1),
      ),
      pass ? { error: null, value: 1 } : { error: "error", value },
    );
  }
});
Deno.test("seal : other", () => {
  assertThrows(() =>
    seal(() => { // deno-lint-ignore no-throw-literal
      throw null;
    })()
  );
});

Deno.test("open : try", () => {
  for (const value of [true, false]) {
    assertEquals(
      type<Result<true, { error: false }>>()(
        wrap(as<{ error: false }>(), (no) =>
          open(
            type<Result<true, { error: false }>>()(
              value ? { error: null, value } : { error: "error", value },
            ),
            { error: no },
          )),
      ),
      { error: value ? null : "error", value },
    );
  }
});
Deno.test("open : catch", () => {
  for (const value of [false, true]) {
    assertEquals(
      type<boolean>()(open(
        type<Result<true, { error: false }>>()(
          value ? { error: null, value } : { error: "error", value },
        ),
        { error: () => value },
      )),
      value,
    );
  }
});
