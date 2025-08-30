// deno-coverage-ignore-file
import fc from "fast-check";

/** Fetches a specific RFC. */
export const rfc = ($: number): string => `www.rfc-editor.org/rfc/rfc${$}.txt`;
/** Fetches from a text file. */
export const get_txt = ($: string, min: number, max: number): Promise<string> =>
  fetch(`https://${$}`).then(async ($) => (await $.text()).slice(min, max));
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
/** Fetches from a JSON file. */
export const get_json = <A extends Json>($: string): Promise<A> =>
  fetch(`https://${$}`).then(($) => $.json());
/** Fetches an RFC's text. */
export const get_rfc = ($: number, min: number, max: number): Promise<string> =>
  get_txt(`www.rfc-editor.org/rfc/rfc${$}.txt`, min, max);
/** Fetches Wycheproof test vectors. */
export const get_wycheproof = <A extends Json, B extends Json = {}>(
  hash: string,
  name: string,
  mapper: (group: { tests: A[] } & B) => Json[],
): Promise<Json[]> =>
  get_json<{ testGroups: ({ tests: A[] } & B)[] }>(
    `raw.githubusercontent.com/C2SP/wycheproof/${hash}/testvectors_v1/${name}_test.json`,
  ).then(({ testGroups }) => testGroups.flatMap(mapper));
/** Extracts base16 from enclosing text. */
export const hex = ($: string): string =>
  ($.match(
    /(?<=(?:^|0x|\W)(?:[\da-f]{2})*)[\da-f]{2}(?=(?:[\da-f]{2})*(?:\W|$))/g,
  ) ?? []).join("");
/** Writes JSON to an adjacent `vectors.json` file. */
export const write_vectors = (
  meta: ImportMeta,
  vectors: { [name: string]: Json },
): Promise<void> =>
  Deno.writeTextFile(`${meta.dirname}/vectors.json`, JSON.stringify(vectors));
/** Creates a number arbitrary. */
export const fc_num = ($?: fc.DoubleConstraints): fc.Arbitrary<number> =>
  fc.double({ noDefaultInfinity: true, noNaN: true, ...$ });
/** Creates a string arbitrary. */
export const fc_str = ($?: fc.StringConstraints): fc.Arbitrary<string> =>
  fc.string({ unit: "grapheme", size: "medium", ...$ });
/** Creates a binary arbitrary. */
export const fc_bin = ($?: fc.IntArrayConstraints): fc.Arbitrary<Uint8Array> =>
  fc.uint8Array({ size: "large", ...$ });
/** 32-byte binary arbitrary. */
export const fc_key: fc.Arbitrary<Uint8Array<ArrayBuffer>> = fc.uint8Array(
  { minLength: 32, maxLength: 32 },
);
const fc_report = <A>($: fc.RunDetails<A>) => {
  if ($.failed) {
    console.error(
      { runs: $.numRuns, seed: $.seed, path: $.counterexamplePath },
      $.counterexample,
    );
    throw $.errorInstance;
  }
};
/** Checks a property and reports failures. */
export const fc_check = ((
  property: fc.IProperty<any> | fc.IAsyncProperty<any>,
  parameters?: fc.Parameters<any>,
) => {
  const a = fc.check(property, parameters);
  return a instanceof Promise ? a.then(fc_report) : fc_report(a);
}) as {
  <A>($: fc.IProperty<A>, parameters?: fc.Parameters<A>): void;
  <A>($: fc.IAsyncProperty<A>, parameters?: fc.Parameters<A>): Promise<void>;
};
