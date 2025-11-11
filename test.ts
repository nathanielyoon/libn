// deno-coverage-ignore-file
import fc from "fast-check";

/** Fetches a list of URLs, optionally slicing or mapping their texts. */
export const source = <A extends ([number?, number?] | (($: string) => {}))[]>(
  urls: TemplateStringsArray,
  ...ranges: A
): Promise<{ [B in keyof A]: A[B] extends ($: any) => infer C ? C : string }> =>
  Promise.all(ranges.map(async ($, z) => {
    const base = urls[z + 1].trim();
    const text = await (await fetch(
      `https://${base[0] === "/" ? "raw.githubusercontent.com" : ""}${base}`,
    )).text();
    return typeof $ === "object" ? text.slice($[0], $[1]) : $(text);
  })) as Promise<{ [B in keyof A]: any }>;
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
/** Creates a binary arbitrary with (or if negative, without) the set length. */
export const fcBytes = ($: number): fc.Arbitrary<Uint8Array<ArrayBuffer>> =>
  $ > 0 ? fc.uint8Array({ minLength: $, maxLength: $ }) : fc.oneof(
    fc.uint8Array({ minLength: -~-$ }),
    fc.uint8Array({ maxLength: ~$ }),
  );
type Both<A, B> = [A] extends [B] ? [B] extends [A] ? true : false : false;
type Are<A, B> = Both<
  <C>(_: A) => C extends A & C | C ? true : false,
  <C>(_: B) => C extends B & C | C ? true : false
>;
type Delve<A> = A extends { [_: PropertyKey]: unknown }
  ? { [B in keyof A]: Delve<A[B]> }
  : A;
type Is<A, B> = [A, B] extends [never, never] ? true
  : [false, false] extends [true & A, true & B] ? true
  : Are<Delve<A>, Delve<B>>;
/** Checks the type of a value and returns it. */
export const type =
  <const A>(_?: A): <B extends A>($: Is<A, B> extends true ? B : never) => B =>
  <B extends A>($: B) => $;
