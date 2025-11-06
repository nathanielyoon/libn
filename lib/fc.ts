/** @module fc */
import { assertEquals } from "@std/assert";
import fc from "fast-check";

/** Creates a (not-)specific-length binary arbitrary. */
export const fcBinary = ($: number): fc.Arbitrary<Uint8Array<ArrayBuffer>> =>
  $ > 0 ? fc.uint8Array({ minLength: $, maxLength: $ }) : fc.oneof(
    fc.uint8Array({ minLength: -$ + 1 }),
    fc.uint8Array({ maxLength: -$ - 1 }),
  );
/** Creates an assertion that a function returns its input unchanged. */
export const identity = <A>(maybe: ($: A) => A): ($: A) => void => ($) =>
  assertEquals(maybe($), $);
