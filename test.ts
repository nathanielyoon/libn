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
/** Writes test vectors. */
export const set = (at: ImportMeta): ($: any) => Promise<void> => ($) =>
  Deno.writeTextFile(new URL(at.resolve("./vectors.json")), JSON.stringify($));
/** Creates a binary arbitrary with (or if negative, without) the set length. */
export const fcBytes = ($?: number): fc.Arbitrary<Uint8Array<ArrayBuffer>> => {
  if (!$) return fc.uint8Array({ size: "medium" });
  return $ > 0 ? fc.uint8Array({ minLength: $, maxLength: $ }) : fc.oneof(
    fc.uint8Array({ minLength: -~-$ }),
    fc.uint8Array({ maxLength: ~$ }),
  );
};
type Both<A, B> = [A] extends [B] ? [B] extends [A] ? true : false : false;
type Are<A, B> = Both<
  <C>(_: A) => C extends A & C | C ? true : false,
  <C>(_: B) => C extends B & C | C ? true : false
>;
type Delve<A> = A extends { [_: PropertyKey]: unknown }
  ? { [B in keyof A]: Delve<A[B]> }
  : A;
/** Resolves to `true` if two types are exactly equal, `false` otherwise. */
export type Is<A, B> = [A, B] extends [never, never] ? true
  : [false, false] extends [true & A, true & B] ? true
  : Are<Delve<A>, Delve<B>>;
/** Checks the type of a value and returns it. */
export const type =
  <const A>(_?: A): <B extends A>($: Is<A, B> extends true ? B : never) => B =>
  <B extends A>($: B) => $;
