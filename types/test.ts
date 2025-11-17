import { type Is, type } from "@libn/types";
import { assertEquals } from "@std/assert";
import { assertType } from "@std/testing/types";

Deno.test("Is : @std/testing IsExact tests", () => {
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
});
Deno.test("Is : type-fest IsEqual tests", () => {
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
  type Sequence<A, B extends number, C extends A[] = []> = B extends B
    ? C["length"] extends B ? C : Sequence<A, B, [...C, A]>
    : never;
  type Long = Sequence<0, 50>;
  assertType<Is<Long, Long>>(true);
  type ReadonlyLong = Readonly<Sequence<0, 50>>;
  assertType<Is<ReadonlyLong, ReadonlyLong>>(true);
  assertType<Is<ReadonlyLong, Long>>(false);
  type WrappedSame<Tpl> = Tpl extends [[0, 2]] ? "Foo" : "Bar";
  type WrappedDiff<Tpl> = Tpl extends [[0, 1]] ? "Foo" : "Bar";
  type Same<Tpl> = Tpl extends [0, 2] ? "Foo" : "Bar";
  type Diff<Tpl> = Tpl extends [0, 1] ? "Foo" : "Bar";
  assertType<Is<(WrappedSame<[[0, 2]]> & WrappedDiff<[[0, 2]]>), never>>(true);
  assertType<
    [0, 2] extends infer Tpl
      ? Is<(WrappedSame<[Tpl]> & WrappedDiff<[Tpl]>), never>
      : never
  >(true);
  assertType<Is<(Same<[0, 2]> & Diff<[0, 2]>), never>>(true);
  assertType<
    [0, 2] extends infer Tpl ? Is<(Same<Tpl> & Diff<Tpl>), never> : never
  >(true);
  assertType<Is<[{ a: 1 }] & [{ a: 1 }], [{ a: 1 }]>>(true);
});
Deno.test("type : valid/invalid types", () => {
  // @ts-expect-error expect unknown
  type()(0);
  assertEquals(type(0)(0), 0);
  assertEquals(type<0>()(0), 0);
  // @ts-expect-error incorrect
  type(0)(1);
});
