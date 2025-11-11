// deno-coverage-ignore-file
import fc from "fast-check";

/** Fetches a URL (or GitHub path), optionally slicing, matching, or mapping. */
export const source = (async ($: string, to?: any) => {
  const text = await (await fetch(
    `https://${$[0] === "/" ? "raw.githubusercontent.com" : ""}${$}`,
  )).text();
  if (!to) return text;
  if (typeof to === "function") return to(JSON.parse(text));
  const slice = text.slice(to[0], to[1]);
  return !to[2] ? slice : Array.from(
    to[2].global ? slice.matchAll(to[2]) : [slice.match(to[2])!],
    ($) => $.groups,
  );
}) as {
  ($: string, to?: [number?, number?]): Promise<string>;
  ($: string, to: [number, number, RegExp]): Promise<{ [_: string]: string }[]>;
  <A>($: string, to: ($: any) => A): Promise<A>;
};
/** Extracts base16 from enclosing text. */
export const hex = ($: string): string =>
  $.match(
    /(?<=(?:^|0x|\W)(?:[\da-f]{2})*)[\da-f]{2}(?=(?:[\da-f]{2})*(?:\W|$))/g,
  )?.join("") ?? "";
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
