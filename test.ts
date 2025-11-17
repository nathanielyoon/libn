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
  new Uint8Array((await Array.fromAsync<Uint8Array>(
    new Blob([$]).stream().pipeThrough(stream) as any,
  )).flatMap(($) => [...$]));
/** Stringifies, checks, and writes test vectors. */
export const set = async (
  at: ImportMeta,
  $: any,
  expected: string,
): Promise<void> => {
  const json = JSON.stringify($);
  const actual = new Uint8Array(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(json)),
  ).reduce((hex, byte) => hex + byte.toString(16).padStart(2, "0"), "");
  if (actual !== expected) throw Error(JSON.stringify({ actual, expected }));
  await Deno.writeTextFile(new URL(at.resolve("./vectors.json")), json);
};
/** @internal */
type Fc<A, B> = A extends ($?: infer C) => infer D ? ($?: C | B) => D : never;
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
