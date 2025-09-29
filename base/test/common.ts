import { assertEquals } from "@std/assert";
import type fc from "fast-check";
import { de_bin, en_bin } from "@libn/base";
import { fc_assert, fc_bin } from "@libn/lib";
import type { Decode, Encode } from "../src/common.ts";

/** Asserts a round-trip. */
export const round_trip = (
  encode: Encode,
  decode: Decode,
  arbitrary: fc.Arbitrary<Uint8Array> = fc_bin(),
): void => fc_assert(arbitrary)(($) => assertEquals(decode(encode($)), $));
/** Asserts RFC4648 vectors. */
export const rfc4648 = (
  encode: Encode,
  decode: Decode,
  vectors: { ascii: string; binary: string }[],
): void =>
  vectors.forEach(($) => {
    assertEquals(encode(en_bin($.ascii)), $.binary);
    assertEquals(de_bin(decode($.binary)), $.ascii);
  });
