// deno-coverage-ignore-file
import fc from "fast-check";

/** Checks a property. */
export const fc_check = <A>(
  property: fc.IProperty<A>,
  parameters?: fc.Parameters<A>,
): void => {
  const a = fc.check(property, parameters);
  if (a.failed) {
    console.error(
      a.numRuns,
      { seed: a.seed, path: a.counterexamplePath },
      a.counterexample,
    );
    throw a.errorInstance;
  }
};
/** Default number arbitrary. */
export const fc_number = ($?: fc.DoubleConstraints): fc.Arbitrary<number> =>
  fc.double({ noDefaultInfinity: true, noNaN: true, ...$ });
/** Default string arbitrary. */
export const fc_string = ($?: fc.StringConstraints): fc.Arbitrary<string> =>
  fc.string({ unit: "grapheme", size: "medium", ...$ });
