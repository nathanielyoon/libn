// deno-coverage-ignore-file
import fc from "fast-check";

type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
/** Fetches an RFC's text. */
export const get_rfc = ($: number, min: number, max: number): Promise<string> =>
  fetch(`https://www.rfc-editor.org/rfc/rfc${$}.txt`)
    .then(async ($) => (await $.text()).slice(min, max));
/** Fetches Wycheproof test vectors. */
export const get_wycheproof = <A extends Json, B extends Json = {}>(
  hash: string,
  name: string,
  mapper: (group: { tests: A[] } & B) => Json[],
): Promise<Json[]> =>
  fetch(
    `https://raw.githubusercontent.com/C2SP/wycheproof/${hash}/testvectors_v1/${name}_test.json`,
  ).then<{ testGroups: ({ tests: A[] } & B)[] }>(($) => $.json())
    .then(({ testGroups }) => testGroups.flatMap(mapper));
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
      $.numRuns,
      { seed: $.seed, path: $.counterexamplePath },
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
/** Initializes a simple LCG. */
export const rng = (seed = Date.now()): () => number => (
  seed = seed % 0x100000000 >>> 0, () => seed = seed * 0x3d575 + 1 >>> 0
);
/** Hashes (non-cryptographically), one byte at a time. */
export const oaat = (data: Uint8Array, seed: number): number => {
  let a = seed ^ 0x3b00, b = seed << 15 | seed >>> 17, z = 0;
  while (z < data.length) b -= a = (a + data[z++]) * 9, a = a << 7 | a >>> 25;
  return (a ^ b) >>> 0;
};
