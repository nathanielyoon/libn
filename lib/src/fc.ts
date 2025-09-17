// deno-coverage-ignore-file
import fc from "fast-check";

/** Creates a number arbitrary. */
export const fc_number = ($?: fc.DoubleConstraints): fc.Arbitrary<number> =>
  fc.double({ noDefaultInfinity: true, noNaN: true, ...$ });
/** Creates a string arbitrary. */
export const fc_string = ($?: fc.StringConstraints): fc.Arbitrary<string> =>
  fc.string({ unit: "grapheme", size: "medium", ...$ });
/** Creates a binary arbitrary. */
export const fc_binary = (
  $?: fc.IntArrayConstraints | number,
): fc.Arbitrary<Uint8Array<ArrayBuffer>> =>
  fc.uint8Array(
    typeof $ === "number"
      ? { minLength: $, maxLength: $ }
      : { size: "large", ...$ },
  );
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
