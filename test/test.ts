import { assertEquals } from "@std/assert";
import fc from "fast-check";
import type { Result, Union } from "@libn/result";

/** JSON value. */
export type Json = null | boolean | number | string | readonly Json[] | {
  [_: string]: Json;
};
type Are<A, B> = [A, B] extends [B, A] ? true : false;
/** @internal */
type Exact<A, B> = Are<
  <C>(_: A) => C extends A & C | C ? true : false,
  <C>(_: B) => C extends B & C | C ? true : false
>;
/** @internal */
type Delve<A> = A extends { [_: PropertyKey]: unknown }
  ? { [B in keyof A]: Delve<A[B]> }
  : A;
/** Whether two types are exactly equal. */
export type Is<A, B> = [A, B] extends [never, never] ? true // both `never`
  : [false, false] extends [true & A, true & B] ? true // both `any`
  : Exact<Delve<A>, Delve<B>>;
/** Checks the type of a value and returns it. */
export const type =
  <const A>(_?: A): <B extends A>($: Is<A, B> extends true ? B : never) => B =>
  <B extends A>($: B) => $;

/** Fetches text from a URL or GitHub path, optionally slicing. */
export const get = async (
  [$]: readonly string[], // to allow calling as tagged template literal
  min?: number,
  max?: number,
): Promise<string> =>
  (await (await fetch(
    `https://${$[0] === "/" ? "raw.githubusercontent.com" : ""}${$}`,
  )).text()).slice(min, max);
/** Stringifies, checks, and writes test vectors. */
export const set = async (url: string, $: Json, sum: string): Promise<void> => {
  const bytes = new TextEncoder().encode(JSON.stringify($));
  const hash = btoa(String.fromCharCode(
    ...new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)),
  ));
  if (hash !== sum) throw Error(`"${hash}" != "${sum}"`);
  await Deno.writeFile(new URL(url), bytes);
};

/** @internal */
type Fc<A, B> = A extends ($?: infer C) => infer D ? ($?: C | B) => D : never;
/** Creates a number arbitrary. */
export const fcNum: Fc<typeof fc.double, number> = ($) =>
  typeof $ === "number"
    ? fc.nat({ max: $ })
    : fc.double({ noNaN: true, noDefaultInfinity: true, ...$ });
/** Creates a string arbitrary. */
export const fcStr: Fc<typeof fc.string, RegExp | string> = ($) =>
  $ instanceof RegExp || typeof $ === "string"
    ? fc.stringMatching(RegExp($))
    : fc.string({ unit: "grapheme", size: "medium", ...$ });
/** Creates a binary arbitrary. */
export const fcBin: Fc<typeof fc.uint8Array, number> = ($) =>
  typeof $ === "number"
    ? $ >= 0 ? fc.uint8Array({ minLength: $, maxLength: $ }) : fc.oneof(
      fc.uint8Array({ minLength: -$ + 1 }),
      fc.uint8Array({ maxLength: -$ - 1 }),
    )
    : fc.uint8Array({ size: "medium", ...$ });

/** Asserts a result passes with the expected value. */
export const assertPass = <A, B extends Union>(
  actual: Result<A, B>,
  expected: A,
): void => assertEquals(actual, { error: null, value: expected });
/** Asserts a result fails with one of the expected errors. */
export const assertFail = <A, B extends Union>(
  { error, value }: Result<A, B>,
  expected: Partial<B>,
): void => assertEquals({ error, value }, { error, value: expected[error!] });
