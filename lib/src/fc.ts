// deno-coverage-ignore-file
import fc from "fast-check";
import type { Json } from "./types.ts";

/** Creates a number arbitrary. */
export const fc_num = ($?: fc.DoubleConstraints): fc.Arbitrary<number> =>
  fc.double({ noDefaultInfinity: true, noNaN: true, ...$ });
/** Creates a string arbitrary. */
export const fc_str = ($?: fc.StringConstraints): fc.Arbitrary<string> =>
  fc.string({ unit: "grapheme", size: "medium", ...$ });
/** Creates a binary arbitrary. */
export const fc_bin = (
  $?: fc.IntArrayConstraints | number,
): fc.Arbitrary<Uint8Array<ArrayBuffer>> =>
  typeof $ !== "number"
    ? fc.uint8Array({ size: "large", ...$ })
    : $ < 0
    ? fc.oneof(
      fc.uint8Array({ minLength: -$ + 1 }),
      fc.uint8Array({ maxLength: -$ - 1 }),
    )
    : fc.uint8Array({ minLength: $, maxLength: $ });
/** Creates a correctly-typed JSON value arbitrary. */
export const fc_json = ($?: fc.JsonSharedConstraints): fc.Arbitrary<Json> =>
  fc.jsonValue($) as fc.Arbitrary<Json>;
const fc_report = <A>($: fc.RunDetails<A>) => {
  if ($.failed) {
    console.error(
      $.numRuns,
      { seed: $.seed, path: $.counterexamplePath },
      $.counterexample,
    );
    throw $.errorInstance;
  }
};
/** Checks a property and reports failures. */
export const fc_check = (<A>($: fc.IRawProperty<A>, arg?: fc.Parameters<A>) => {
  const a = fc.check($, arg);
  return a instanceof Promise ? a.then(fc_report) : fc_report(a);
}) as {
  <A>($: fc.IProperty<A>, parameters?: fc.Parameters<A>): void;
  <A>($: fc.IAsyncProperty<A>, parameters?: fc.Parameters<A>): Promise<void>;
};
