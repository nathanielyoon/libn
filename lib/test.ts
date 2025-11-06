import {
  assertEquals,
  assertNotEquals,
  assertRejects,
  assertThrows,
} from "@std/assert";
import fc from "fast-check";
import { assertType } from "@std/testing/types";
import { hasOwn, type Is, isArray, type } from "./is.ts";
import { fcBinary, identity } from "./fc.ts";
import { type Output, run, spawn, tmp } from "./process.ts";
import { open } from "@libn/result";

type Sequence<A, B extends number, C extends A[] = []> = B extends B
  ? C["length"] extends B ? C : Sequence<A, B, [...C, A]>
  : never;
Deno.test("is.Is checks equality", () => {
  // https://github.com/denoland/std/blob/b5a5fe4f96b91c1fe8dba5cc0270092dd11d3287/testing/types_test.ts
  assertType<Is<any, any>>(true);
  assertType<Is<never, never>>(true);
  assertType<Is<unknown, unknown>>(true);
  assertType<Is<never, any>>(false);
  assertType<Is<unknown, any>>(false);
  assertType<Is<{}, {}>>(true);
  assertType<Is<string, any>>(false);
  assertType<Is<string, never>>(false);
  assertType<Is<string, unknown>>(false);
  assertType<Is<string, string | number>>(false);
  assertType<Is<string | number | Date, string | number | Date>>(true);
  assertType<Is<string | number | Date, string | number>>(false);
  assertType<Is<string | number, string | number>>(true);
  assertType<Is<typeof globalThis, typeof globalThis>>(true);
  assertType<Is<Date | typeof globalThis, Date>>(false);
  assertType<Is<string | undefined, string | undefined>>(true);
  assertType<Is<string | undefined, string>>(false);
  assertType<Is<string | undefined, any | string>>(false);
  assertType<Is<any | string | undefined, string>>(false);
  assertType<Is<never, never | string>>(false);
  assertType<Is<[], []>>(true);
  assertType<Is<any[], any[]>>(true);
  assertType<Is<never[], never[]>>(true);
  assertType<Is<unknown[], unknown[]>>(true);
  assertType<Is<any[], []>>(false);
  assertType<Is<any[], never[]>>(false);
  assertType<Is<any[], unknown[]>>(false);
  assertType<Is<[...any[]], [...any[]]>>(true);
  assertType<Is<[any, ...any[]], [any, ...any[]]>>(true);
  assertType<Is<[...any[]], [any, ...any[]]>>(false);
  assertType<Is<[...any[]], [...any[], any]>>(false);
  assertType<Is<[any, ...any[]], [any, ...any[], any]>>(false);
  assertType<Is<[...any[], any], [...any[], any]>>(true);
  assertType<Is<[any, ...any[], any], [any, ...any[], any]>>(true);
  assertType<Is<[...any[]], [any, ...any[], any]>>(false);
  assertType<Is<readonly [], readonly []>>(true);
  assertType<Is<[], readonly []>>(false);
  assertType<Is<[elm?: any], [elm?: any]>>(true);
  assertType<Is<[], [elm?: any]>>(false);
  assertType<Is<[elm: any], [elm?: any]>>(false);
  assertType<Is<() => any, () => any>>(true);
  assertType<Is<() => never, () => never>>(true);
  assertType<Is<() => unknown, () => unknown>>(true);
  assertType<Is<() => any, () => never>>(false);
  assertType<Is<() => any, () => unknown>>(false);
  assertType<Is<() => void, () => void>>(true);
  assertType<Is<() => void, () => undefined>>(false);
  assertType<Is<(arg: any) => void, (arg: any) => void>>(true);
  assertType<Is<(arg?: any) => void, (arg?: any) => void>>(true);
  assertType<Is<() => void, (arg?: any) => void>>(false);
  assertType<Is<(arg: any) => void, (arg?: any) => void>>(false);
  assertType<Is<(arg: any) => void, (arg: unknown) => void>>(false);
  assertType<
    Is<(arg: any, ...args: any[]) => void, (arg: any, ...args: any[]) => void>
  >(true);
  assertType<Is<(...args: any[]) => void, (...args: any[]) => void>>(true);
  assertType<Is<(...args: any[]) => void, (...args: unknown[]) => void>>(false);
  assertType<
    Is<
      (arg: any, ...args: any[]) => void,
      (arg: any, ...args: unknown[]) => void
    >
  >(false);
  assertType<
    Is<
      (arg: any, ...args: any[]) => void,
      (arg: unknown, ...args: any[]) => void
    >
  >(false);
  type Type<A> = { _: A };
  assertType<Is<Type<any>, Type<any>>>(true);
  assertType<Is<Type<any>, Type<number>>>(false);
  assertType<
    Is<Type<{ x: any; prop?: any }>, Type<{ x: any; prop?: any }>>
  >(true);
  assertType<
    Is<Type<{ x: any; prop?: any }>, Type<{ x: any; other?: any }>>
  >(false);
  assertType<
    Is<
      Type<{ x: any; readonly prop: any }>,
      Type<{ x: any; readonly prop: any }>
    >
  >(true);
  assertType<
    Is<
      Type<{ x: any; prop: any }>,
      Type<{ x: any; readonly prop: any }>
    >
  >(false);
  assertType<Is<{ prop: any }, { prop: any }>>(true);
  assertType<Is<{ prop: never }, { prop: never }>>(true);
  assertType<Is<{ prop: unknown }, { prop: unknown }>>(true);
  assertType<Is<{ prop: string }, { prop: string }>>(true);
  assertType<Is<{ prop: any }, { prop: never }>>(false);
  assertType<Is<{ prop: any }, { prop: unknown }>>(false);
  assertType<Is<{ prop: any }, { prop: string }>>(false);
  assertType<Is<{ prop: unknown }, { prop: never }>>(false);
  assertType<Is<{ prop: string }, { prop: never }>>(false);
  assertType<Is<{ prop: Date }, { prop: string }>>(false);
  assertType<Is<{ name: string; other?: Date }, { name: string }>>(false);
  assertType<Is<{ other?: Date }, { prop?: string }>>(false);
  assertType<Is<{ readonly prop: any }, { readonly prop: any }>>(true);
  assertType<Is<{ prop: any }, { readonly prop: any }>>(false);
  assertType<Is<{ prop: { prop?: string } }, { prop: { prop: string } }>>(
    false,
  );
  assertType<Is<{ prop: string | undefined }, { prop?: string }>>(false);
  assertType<Is<{ prop: { prop: unknown } }, { prop: { prop: any } }>>(false);
  assertType<Is<{ prop: { prop: unknown } }, { prop: { prop: never } }>>(false);
  assertType<
    Is<{ prop: any } | { prop: string }, { prop: number } | { prop: string }>
  >(false);
  assertType<Is<{ prop: { prop: string } }, { prop: { prop: string } }>>(true);
  assertType<Is<{ prop: { prop: any } }, { prop: { prop: never } }>>(false);
  assertType<Is<{ prop: { prop: any } }, { prop: { prop: string } }>>(false);
  assertType<
    Is<
      { [x: string]: unknown; prop: any } & { prop: unknown },
      { [x: string]: unknown; prop: unknown }
    >
  >(false);
  assertType<
    Is<
      { [x: string]: unknown; prop: unknown },
      { [x: string]: unknown; prop: any } & { prop: unknown }
    >
  >(false);
  assertType<
    Is<
      { [x: string]: unknown } & { prop: unknown },
      { [x: string]: unknown; prop: unknown }
    >
  >(true);
  assertType<
    Is<
      { [x: string]: unknown; prop: unknown },
      { [x: string]: unknown } & { prop: unknown }
    >
  >(true);
  type Inner = string | number | Date | Inner[];
  assertType<Is<Inner, Inner>>(true);
  type Outer = { a: string; prop: Outer; sub: { prop: Outer; other: Inner } };
  assertType<Is<Outer, Outer>>(true);
  assertType<Is<Inner, Outer>>(false);
  // https://github.com/sindresorhus/type-fest/blob/785549f36465e3f3d99a08832784b603261f74f2/test-d/is-equal.ts
  assertType<Is<number, string>>(false);
  assertType<Is<1, 1>>(true);
  assertType<Is<"A", "B">>(false);
  assertType<Is<"foo", "foo">>(true);
  assertType<Is<true, false>>(false);
  assertType<Is<false, false>>(true);
  assertType<Is<any, number>>(false);
  assertType<Is<"", never>>(false);
  assertType<Is<any, any>>(true);
  assertType<Is<never, never>>(true);
  assertType<Is<any, never>>(false);
  assertType<Is<never, any>>(false);
  assertType<Is<any, unknown>>(false);
  assertType<Is<never, unknown>>(false);
  assertType<Is<unknown, never>>(false);
  assertType<Is<[never], [unknown]>>(false);
  assertType<Is<[unknown], [never]>>(false);
  assertType<Is<[any], [never]>>(false);
  assertType<Is<[any], [any]>>(true);
  assertType<Is<[never], [never]>>(true);
  assertType<Is<1 | 2, 1>>(false);
  assertType<Is<1 | 2, 2 | 3>>(false);
  assertType<Is<1 | 2, 2 | 1>>(true);
  assertType<Is<boolean, true>>(false);
  assertType<Is<{ a: 1 }, { a: 1 }>>(true);
  assertType<Is<{ a: 1 }, { a?: 1 }>>(false);
  assertType<Is<{ a: 1 }, { readonly a: 1 }>>(false);
  assertType<Is<[], []>>(true);
  assertType<Is<readonly [], readonly []>>(true);
  assertType<Is<readonly [], []>>(false);
  assertType<Is<number[], number[]>>(true);
  assertType<Is<readonly number[], readonly number[]>>(true);
  assertType<Is<readonly number[], number[]>>(false);
  assertType<Is<[string], [string]>>(true);
  assertType<Is<[string], [string, number]>>(false);
  assertType<Is<[0, 1] | [0, 2], [0, 2]>>(false);
  type Long = Sequence<0, 50>;
  assertType<Is<Long, Long>>(true);
  type ReadonlyLong = Readonly<Sequence<0, 50>>;
  assertType<Is<ReadonlyLong, ReadonlyLong>>(true);
  assertType<Is<ReadonlyLong, Long>>(false);
  type WrappedTupleMatches<Tpl> = Tpl extends [[0, 2]] ? "Foo" : "Bar";
  type WrappedTupleDoesNotMatch<Tpl> = Tpl extends [[0, 1]] ? "Foo" : "Bar";
  type TupleMatches<Tpl> = Tpl extends [0, 2] ? "Foo" : "Bar";
  type TupleDoesNotMatch<Tpl> = Tpl extends [0, 1] ? "Foo" : "Bar";
  assertType<
    Is<
      (WrappedTupleMatches<[[0, 2]]> & WrappedTupleDoesNotMatch<[[0, 2]]>),
      never
    >
  >(true);
  assertType<
    [0, 2] extends infer Tpl ? Is<
        (WrappedTupleMatches<[Tpl]> & WrappedTupleDoesNotMatch<[Tpl]>),
        never
      >
      : never
  >(true);
  assertType<Is<(TupleMatches<[0, 2]> & TupleDoesNotMatch<[0, 2]>), never>>(
    true,
  );
  assertType<
    [0, 2] extends infer Tpl
      ? Is<(TupleMatches<Tpl> & TupleDoesNotMatch<Tpl>), never>
      : never
  >(true);
  assertType<Is<[{ a: 1 }] & [{ a: 1 }], [{ a: 1 }]>>(true);
});
Deno.test("is.type() checks types", () => {
  // @ts-expect-error expect unknown
  type()(0);
  assertEquals(type(0)(0), 0);
  assertEquals(type<0>()(0), 0);
  // @ts-expect-error incorrect
  type(0)(1);
});
Deno.test("is.isArray() aliases Array.isArray", () =>
  fc.assert(fc.property(fc.constantFrom<0 | readonly [1]>(0, [1]), ($) => {
    if (isArray($)) assertEquals(type<readonly [1]>()($), [1]);
    else assertEquals(type<0>()($), 0);
  })));
Deno.test("is.hasOwn() aliases Object.hasOwn", () =>
  fc.assert(fc.property(fc.constantFrom({ 0: 0 }, {}), ($) => {
    if (hasOwn($, "0")) assertEquals(type<{ readonly 0: 0 }>()($), { 0: 0 });
    else assertEquals(type<{ readonly 0?: never }>()($), {});
  })));
Deno.test("fc.fcBinary() returns specific-length binary", () =>
  fc.assert(fc.property(
    fc.integer({ min: 1, max: 1e3 }).chain(($) =>
      fc.record({
        length: fc.constant($),
        binary: fc.array(fcBinary($)),
      })
    ),
    ({ binary, length }) => {
      for (const $ of binary) assertEquals($.length, length);
    },
  )));
Deno.test("fc.fcBinary() returns not-specific-length binary", () =>
  fc.assert(fc.property(
    fc.integer({ min: 1, max: 1e3 }).chain(($) =>
      fc.record({
        length: fc.constant($),
        binary: fc.array(fcBinary(-$)),
      })
    ),
    ({ binary, length }) => {
      for (const $ of binary) assertNotEquals($.length, length);
    },
  )));
Deno.test("fc.identity() validates an identity function", () =>
  fc.assert(fc.property(fc.anything(), identity(($) => $))));
Deno.test("fc.identity() rejects a changing function", () =>
  fc.assert(fc.property(fc.uint8Array({ minLength: 1 }), ($) => {
    assertThrows(() =>
      identity((old: Uint8Array) => old.with(0, old[0] + 1))($)
    );
  })));
Deno.test("process.tmp() disposes", async () => {
  let path;
  {
    await using temp = await tmp();
    path = temp.directory;
    await Deno.writeFile(temp("/file"), new Uint8Array());
    assertEquals(await Array.fromAsync(Deno.readDir(path)), [{
      isDirectory: false,
      isFile: true,
      isSymlink: false,
      name: "file",
    }]);
  }
  assertRejects(
    () => Array.fromAsync(Deno.readDir(path)),
    Deno.errors.NotFound,
  );
});
const assertHello = ($: Output) =>
  assertEquals(open($, true), new TextEncoder().encode("hello"));
const assertFalse = ($: Output) =>
  assertEquals(open($, false), { code: 1, stderr: new Uint8Array() });
Deno.test("process.run() calls", async () => {
  assertHello(await run("echo", ["-n", "hello"]));
  assertFalse(await run("false", []));
});
Deno.test("process.spawn() pipes and calls", async () => {
  assertHello(await spawn("cat", new TextEncoder().encode("hello")));
  assertFalse(await spawn("false", new Uint8Array()));
});
