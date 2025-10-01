// deno-coverage-ignore-file
import fc from "fast-check";
import type { Json, Some } from "./types.ts";

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
      { seed: $.seed, path: $.counterexamplePath },
      $.counterexample,
      $.numRuns,
    );
    throw $.errorInstance;
  }
};
/** @internal */
type Arbitraries<A extends Some> = { [B in keyof A]: fc.Arbitrary<A[B]> };
/** @internal */
type FcAssert<A extends Some> = {
  (
    check: (...$: A) => boolean | void,
    options?: fc.Parameters<A> & { async?: false },
  ): void;
  (
    check: (...$: A) => Promise<boolean | void>,
    options: fc.Parameters<A> & { async: true },
  ): Promise<void>;
};
/** Asserts a property, throwing thrown failures. */
export const fc_assert = <A extends Some>(...$: Arbitraries<A>): FcAssert<A> =>
  ((check: (...$: A) => any, options?: fc.Parameters<A> & { async?: true }) =>
    options?.async
      ? fc.check(fc.asyncProperty(...$, check), options).then(fc_report)
      : fc_report(fc.check(fc.property(...$, check), options))) as FcAssert<A>;
/** Runs benchmarks. */
export const fc_bench = <A extends unknown[]>(
  { group, runs, assert }: { group: string; runs?: number; assert?: boolean },
  arbitrary: fc.Arbitrary<A>,
  cases: NoInfer<{ [_: string]: (...$: A) => any }>,
): void => {
  const seed = Date.now() | 0;
  const all = new Set<string>();
  const numRuns = runs ?? 64;
  for (const key of Object.keys(cases)) {
    Deno.bench(key, { group }, async (b) => {
      const source = fc.sample(arbitrary, { seed, numRuns });
      const target = cases[key];
      const output = Array(runs);
      b.start();
      for (let z = 0; z < source.length; ++z) {
        output[z] = await target(...source[z]);
      }
      b.end();
      if (assert) {
        const string = JSON.stringify(output);
        if (all.size) console.assert(all.has(string));
        else all.add(string);
      }
    });
  }
};
