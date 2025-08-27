// deno-coverage-ignore-file
import fc from "fast-check";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
/** Fetches, parses, and writes test data to an adjacent `vectors.json` file. */
export const vectors =
  (async (meta: ImportMeta, $: string | number, use: ($: any) => Json) =>
    meta.main &&
    (typeof $ === "string"
      ? (await fetch(`https://raw.githubusercontent.com/${$}.json`)).json()
      : (await fetch(`https://www.rfc-editor.org/rfc/rfc${$}.txt`)).text())
      .then(use).then((generated) =>
        Deno.readTextFile(`${meta.dirname}/vectors.json`).catch((thrown) => {
          if (thrown instanceof Deno.errors.NotFound) return "{}";
          throw thrown;
        }).then(JSON.parse).then((json) =>
          JSON.stringify([json, generated].reduce((to, $) => ({
            ...to,
            ...(typeof $ === "object" && $ && !Array.isArray($) ? $ : {}),
          }), {}))
        )
      )
      .then(Deno.writeTextFile.bind(Deno, `${meta.dirname}/vectors.json`))) as {
      (meta: ImportMeta, $: number, to: ($: string) => Json): Promise<void>;
      <A = any>(meta: ImportMeta, $: string, to: ($: A) => Json): Promise<void>;
    };
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
