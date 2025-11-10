// deno-coverage-ignore-file
import { assert, assertEquals } from "@std/assert";
import fc from "fast-check";

const url = ($: string) =>
  `https://${$[0] === "/" ? "raw.githubusercontent.com" : ""}${$}`;
/** Fetches text, optionally slicing it. */
export const getText = async (
  $: string,
  ...at: [number?, number?]
): Promise<string> => (await (await fetch(url($))).text()).slice(...at);
/** Fetches JSON. */
export const getJson = async <A>($: string): Promise<A> =>
  await (await fetch(url($))).json() as A;
/** Compresses or decompresses a buffer. */
export const press = async (
  $: BlobPart,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array<ArrayBuffer>> =>
  new Uint8Array((await Array.fromAsync(
    new Blob([$]).stream().pipeThrough(stream),
    ($) => [...$],
  )).flat());
/** Writes test vectors. */
export const save = (at: ImportMeta): ($: any) => Promise<void> => ($) =>
  Deno.writeTextFile(new URL(at.resolve("./vectors.json")), JSON.stringify($));
declare const ANY: unique symbol;
type Delve<A> = A extends { [_: PropertyKey]: any }
  ? { [B in keyof A]: Delve<A[B]> }
  : A;
type An<A> = false extends (true & A) ? typeof ANY : Delve<A>;
type Both<A, B> = [A] extends [B] ? [B] extends [A] ? true : false : false;
type Are<A, B> = Both<
  <C>(_: A) => C extends A & C | C ? true : false,
  <C>(_: B) => C extends B & C | C ? true : false
>;
type Is<A, B> = [A, B] extends [never, never] ? true : Are<An<A>, An<B>>;
/** Checks the type of a value and returns it. */
export const type =
  <const A>(_?: A): <B extends A>($: Is<A, B> extends true ? B : never) => B =>
  <B extends A>($: B) => $;
/** Creates a binary arbitrary with (or if negative, without) the set length. */
export const fcBytes = ($: number): fc.Arbitrary<Uint8Array<ArrayBuffer>> =>
  $ > 0 ? fc.uint8Array({ minLength: $, maxLength: $ }) : fc.oneof(
    fc.uint8Array({ minLength: -~-$ }),
    fc.uint8Array({ maxLength: ~$ }),
  );
type Arby<A> = fc.Arbitrary<A> | { [B in keyof A]: fc.Arbitrary<A[B]> };
const wrap = <A>($: Arby<A>) => $ instanceof fc.Arbitrary ? $ : fc.record($);
const each = <A, B>(run: ($: A, z: number) => B, $: readonly A[]) =>
  $.length ? $.map(run) : [run($[0], -1)];
/** Proxied getter for parameterized test runner. */
export const test: {
  [name: `${string} ${":" | "::"} ${string}`]: {
    ($: (t: Deno.TestContext) => void | Promise<void>): void;
    <const A>(
      $: readonly A[] | Arby<A>,
      check: ($: A, index: number) => void | boolean | readonly any[],
      parameters?: fc.Parameters<[A]> & { async?: false },
    ): void;
    <const A>(
      $: readonly A[] | Arby<A>,
      check: ($: A, index: number) => Promise<void | boolean | readonly any[]>,
      parameters: fc.Parameters<[A]> & { async: true },
    ): void;
  };
} = new Proxy<any>(($: any, result: any) => {
  if (typeof result === "boolean") assert(result);
  else if (Array.isArray(result)) {
    if (result.length > 1) {
      const last = result.pop();
      for (let z = 0; z < result.length; ++z) assertEquals(result[z], last);
    } else assertEquals(result[0], $);
  }
}, {
  get: (call, name: string) =>
  <A>(
    $: A[] | Arby<A> | ((t: Deno.TestContext) => void | Promise<void>),
    run: ($: A, index: number) => any,
    { async, ...arg }: fc.Parameters<[A]> & { async?: boolean } = {},
  ) =>
    Deno.test(
      name,
      typeof $ === "function"
        ? $
        : async
        ? async () =>
          void await (Array.isArray($)
            ? Promise.all(each(async ($, z) => call($, await run($, z)), $))
            : fc.assert(
              fc.asyncProperty(wrap($), async ($) => call($, await run($, -1))),
              arg,
            ))
        : () =>
          void (Array.isArray($)
            ? each(($, z) => call($, run($, z)), $)
            : fc.assert(fc.property(wrap($), ($) => call($, run($, -1))), arg)),
    ),
});
