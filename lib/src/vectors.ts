import { de_b16 } from "@libn/base";
import type { Json } from "./types.ts";

/** Extracts base16 from enclosing text. */
export const trim = ($: string): string =>
  $.match(
    /(?<=(?:^|0x|\W)(?:[\da-f]{2})*)[\da-f]{2}(?=(?:[\da-f]{2})*(?:\W|$))/gi,
  )?.join("") ?? "";
/** Groups into objects. */
export const into = <A, B extends string>(
  $: A[],
  keys: [B, ...B[]],
): { [_ in B]: A }[] => {
  const size = keys.length, out = Array($.length / size);
  for (let from, target: { [key: string]: A }, z = 0, y; z < out.length; ++z) {
    from = z * size, target = out[z] = {}, y = 0;
    do target[keys[y]] = $[from + y]; while (++y < size);
  }
  return out;
};
/** Writes JSON to an adjacent file. */
export const save = (meta: ImportMeta): ($: Json) => Promise<void> => ($) =>
  Deno.writeTextFile(
    new URL(meta.resolve("./vectors.json")),
    JSON.stringify($),
  );
/** Converts base16-encoded vectors to binary. */
export const read = <A extends { [key: string]: Json }>(vectors: A[]): {
  [B in keyof A]: A[B] extends string ? Uint8Array<ArrayBuffer> : A[B];
}[] => {
  const out = Array(vectors.length), keys = Object.keys(vectors[0] ?? {});
  for (let source, target, temp, z = 0, y; z < vectors.length; ++z) {
    source = vectors[z], target = out[z] = {} as { [key: string]: unknown };
    for (y = 0; y < keys.length; ++y) {
      temp = source[keys[y]];
      target[keys[y]] = typeof temp === "string" ? de_b16(temp) : temp;
    }
  }
  return out;
};
