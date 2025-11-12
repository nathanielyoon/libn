// deno-coverage-ignore-file
import fc from "fast-check";

/** Fetches text from a URL or GitHub path, optionally slicing. */
export const get = async (
  [$]: readonly string[],
  min?: number,
  max?: number,
): Promise<string> =>
  (await (await fetch(
    `https://${$[0] === "/" ? "raw.githubusercontent.com" : ""}${$}`,
  )).text()).slice(min, max);
/** Compresses or decompresses a buffer. */
export const zip = async (
  $: BlobPart,
  stream: CompressionStream | DecompressionStream,
): Promise<Uint8Array<ArrayBuffer>> =>
  new Uint8Array((await Array.fromAsync(
    new Blob([$]).stream().pipeThrough(stream),
  )).flatMap(($) => [...$]));
/** Writes test vectors. */
export const set = (at: ImportMeta, $: any): Promise<void> =>
  Deno.writeTextFile(new URL(at.resolve("./vectors.json")), JSON.stringify($));
/** @internal */
type Fc<A, B> = A extends ($?: infer C) => infer D ? ($?: C | B) => D : never;
/** Creates a number arbitrary. */
export const fcNum: Fc<typeof fc.double, never> = ($) =>
  fc.double({ noDefaultInfinity: true, noNaN: true, ...$ });
/** Creates a string arbitrary. */
export const fcStr: Fc<typeof fc.string, RegExp | string> = ($) =>
  $ instanceof RegExp || typeof $ === "string"
    ? fc.stringMatching(RegExp($))
    : fc.string({ unit: "grapheme", size: "medium", ...$ });
/** Creates a binary arbitrary. */
export const fcBin: Fc<typeof fc.uint8Array, number> = ($) =>
  typeof $ === "number"
    ? $ >= 0 ? fc.uint8Array({ minLength: $, maxLength: $ }) : fc.oneof(
      fc.uint8Array({ minLength: -~-$ }),
      fc.uint8Array({ maxLength: ~$ }),
    )
    : fc.uint8Array({ size: "medium", ...$ });
/** Whether two types are mutually assignable. */
export type Are<A, B> = [A, B] extends [B, A] ? true : false;
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
export type Is<A, B> = [A, B] extends [never, never] ? true
  : [false, false] extends [true & A, true & B] ? true
  : Exact<Delve<A>, Delve<B>>;
/** Checks the type of a value and returns it. */
export const type =
  <const A>(_?: A): <B extends A>($: Is<A, B> extends true ? B : never) => B =>
  <B extends A>($: B) => $;
