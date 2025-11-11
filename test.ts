// deno-coverage-ignore-file
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
/** Creates a binary arbitrary with (or if negative, without) the set length. */
export const fcBytes = ($: number): fc.Arbitrary<Uint8Array<ArrayBuffer>> =>
  $ > 0 ? fc.uint8Array({ minLength: $, maxLength: $ }) : fc.oneof(
    fc.uint8Array({ minLength: -~-$ }),
    fc.uint8Array({ maxLength: ~$ }),
  );
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
