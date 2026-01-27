/** @module */
import type { Instance, Json, Schema } from "@libn/json/schema";
import type { Result } from "@libn/result";
import { bisect, isArray } from "./lib.ts";

/** Pointer-generating, clone-returning validator. */
export type Check<A extends Schema> = (
  $: unknown,
) => Generator<string, Instance<A>, void>;
/** Errors from checking invalid data. */
export type ParseError = {
  /** Parsed pointers. */
  Invalid: { data: string; type: string }[];
};

/** Uses a validator as a type predicate. */
export const is = <A extends Schema>(
  check: Check<A>,
  $: unknown,
): $ is Instance<A> => Boolean(check($).next().done);
/** Uses a validator as a parser for deep-copied data or error pointers. */
export const to = <A extends Schema>(
  check: Check<A>,
  $: unknown,
): Result<Instance<A>, ParseError> => {
  const iterator = check($), cause = [];
  let next = iterator.next();
  while (!next.done) {
    const mid = bisect(next.value);
    cause.push({
      data: next.value.slice(0, mid),
      type: next.value.slice(mid + 1),
    }), next = iterator.next();
  }
  if (cause.length) return { error: "Invalid", value: cause };
  else return { error: null, value: next.value };
};

/** Errors from resolving an invalid pointer. */
export type PointerError = {
  /** Extra leading characters. */
  NonslashStart: string;
  /** Current instance and remaining reference tokens (sans leading slashes). */
  UnusedTokens: { value: null | boolean | number | string; tokens: string[] };
  /** Current instance and un-escaped token. */
  NonnumericIndex: { value: readonly Json[]; index: string };
  /** Current instance and not-found index. */
  NonexistentIndex: { value: readonly Json[]; index: number };
  /** Current instance and not-found key. */
  NonexistentKey: { value: { [_: string]: Json }; key: string };
};
/** Resolves a JSON pointer. */
export const point = (
  value: Json,
  pointer: string,
): Result<Json, PointerError> => {
  if (!pointer) return { error: null, value };
  const [head, ...tail] = pointer.split("/");
  if (head) return { error: "NonslashStart", value: head };
  for (let next, z = 0; z < tail.length; value = next, ++z) {
    if (typeof value !== "object" || !value) {
      return { error: "UnusedTokens", value: { value, tokens: tail.slice(z) } };
    }
    const part = tail[z].replaceAll("~1", "/").replaceAll("~0", "~");
    if (isArray(value)) {
      if (!/^(?:[1-9]\d*|0)$/.test(part)) {
        return { error: "NonnumericIndex", value: { value, index: part } };
      }
      if ((next = value[+part]) === undefined) {
        return { error: "NonexistentIndex", value: { value, index: +part } };
      }
    } else if ((next = value[part]) === undefined) {
      return { error: "NonexistentKey", value: { value, key: part } };
    }
  }
  return { error: null, value };
};
