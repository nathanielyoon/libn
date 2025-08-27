// deno-coverage-ignore-file
import fc from "fast-check";

/** Fetches a slice of an RFC's text. */
export const get_rfc = ($: number, min: number, max: number): Promise<string> =>
  fetch(`https://www.rfc-editor.org/rfc/rfc${$}.txt`)
    .then(async ($) => (await $.text()).slice(min, max));
/** Fetches a JSON file from Github. */
export const get_raw = <A>($: string): Promise<A> =>
  fetch(`https://raw.githubusercontent.com/${$}.json`).then(($) => $.json());
/** Fetches test vectors from the Wycheproof repository. */
export const get_wycheproof = <A>($: string) =>
  get_raw<{ testGroups: A[] }>(`C2SP/wycheproof/main/testvectors_v1/${$}_test`);
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
/** Writes JSON to an adjacent `vectors.json` file. */
export const vectors = async (meta: ImportMeta, get: () => Promise<Json>) =>
  meta.main && Deno.writeTextFile(
    `${meta.dirname}/vectors.json`,
    JSON.stringify(await get()),
  );
/** Checks a property. */
export const fc_check = <A>(
  property: (arbitraries: {
    num: ($?: fc.DoubleConstraints) => fc.Arbitrary<number>;
    str: ($?: fc.StringConstraints) => fc.Arbitrary<string>;
    bin: ($?: fc.IntArrayConstraints | number) => fc.Arbitrary<Uint8Array>;
    set: <A>($: fc.Arbitrary<A>) => fc.Arbitrary<[A, A, ...A[]]>;
  }) => fc.IProperty<A>,
  parameters?: fc.Parameters<A>,
): void => {
  const a = fc.check(property({
    num: ($) => fc.double({ noDefaultInfinity: true, noNaN: true, ...$ }),
    str: ($) => fc.string({ unit: "grapheme", size: "medium", ...$ }),
    bin: ($) =>
      fc.uint8Array({
        size: "large",
        ...(typeof $ === "number" ? { minLength: $, maxLength: $ } : $),
      }),
    set: <A>($: fc.Arbitrary<A>) =>
      fc.uniqueArray($, {
        comparator: "SameValueZero",
        minLength: 2,
      }) as fc.Arbitrary<[A, A, ...A[]]>,
  }));
  if (a.failed) {
    console.error(
      a.numRuns,
      { seed: a.seed, path: a.counterexamplePath },
      a.counterexample,
    );
    throw a.errorInstance;
  }
};
