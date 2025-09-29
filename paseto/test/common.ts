// deno-coverage-ignore-file
import fc from "fast-check";
import { fc_bin } from "@libn/lib";
import { type Key, set_use, type Use } from "../src/key.ts";

/** Creates a wrong-use key arbitrary. */
export const fc_wrong_use = (
  wrong: Use[],
): fc.Arbitrary<Uint8Array<ArrayBuffer> | Key<Use>> =>
  fc.oneof(
    fc.tuple(fc.constantFrom(...wrong), fc_bin(32)).map(([use, key]) =>
      set_use(use, key)
    ),
    fc_bin(32),
  );
/** Unique key constraints. */
export const unique: fc.UniqueArrayConstraintsCustomCompare<Uint8Array> = {
  minLength: 2,
  maxLength: 2,
  comparator: (one, two) => {
    for (let z = 0; z < 32; ++z) if (one[z] !== two[z]) return false;
    return true;
  },
};
