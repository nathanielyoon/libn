import fc from "fast-check";
import { fc_json, fc_num, fc_str, type Tuple } from "@libn/lib";
import { array, boolean, number, object, string } from "../src/build.ts";
import { BASES, FORMATS } from "../src/parse.ts";
import type { Base, Format } from "../src/types.ts";

/** Type values. */
export const TYPES = [
  "boolean",
  "number",
  "string",
  "array",
  "object",
] as const;
/** Builder map. */
export const TYPERS = { boolean, number, string, array, object };
/** Creates a regular dictionary arbitrary. */
export const fc_object = <A>(
  value: fc.Arbitrary<A>,
  $?: fc.DictionaryConstraints,
): fc.Arbitrary<{ [_: string]: A }> =>
  fc.dictionary(fc_str(), value, { noNullPrototype: true, ...$ });
/** Valid value map. */
export const fc_types = {
  boolean: fc.boolean,
  number: fc_num,
  string: ($?: fc.StringConstraints) => fc_str($).map(($) => $.normalize()),
  array: ($?: fc.ArrayConstraints) => fc.array(fc_json(), $),
  object: ($?: fc.DictionaryConstraints) => fc_object(fc_json(), $),
};
/** Content encoding arbitrary. */
export const fc_base: fc.Arbitrary<Base> = fc.constantFrom(
  ...Object.keys(BASES) as Tuple<keyof typeof BASES>,
);
/** Format arbitrary. */
export const fc_format: fc.Arbitrary<Format> = fc.constantFrom(
  ...Object.keys(FORMATS) as Tuple<keyof typeof FORMATS>,
);
/** Valid formatted string map. */
export const fc_formats: { [_ in Format]: fc.Arbitrary<string> } = {
  ...([["date", 0, 10], ["time", 11, 24], ["date-time", 0, 24]] as const)
    .reduce((to, [key, lo, hi]) => ({
      ...to,
      [key]: fc.date({
        noInvalidDate: true,
        min: new Date("0000"),
        max: new Date("9999-12-31T23:59:59.999Z"),
      }).map(($) => $.toISOString().slice(lo, hi)),
    }), {} as { [_ in "date" | "time" | "date-time"]: fc.Arbitrary<string> }),
  ...(["email", "uri", "uuid"] as const).reduce((to, key) => ({
    ...to,
    [key]: fc.stringMatching(FORMATS[key]).map(($) => $.trim().normalize())
      .filter(RegExp.prototype.test.bind(FORMATS[key])),
  }), {} as { [_ in "email" | "uri" | "uuid"]: fc.Arbitrary<string> }),
};
/** Creates a unique, non-empty array arbitrary. */
export const fc_enum = <A>($: fc.Arbitrary<A>): fc.Arbitrary<[A, A, ...A[]]> =>
  fc.uniqueArray($, {
    minLength: 2,
    comparator: "SameValueZero",
  }) as fc.Arbitrary<[A, A, ...A[]]>;
/** Creates a unique, ordered array-of-numbers arbitrary. */
export const fc_ordered = (
  count: number,
  arbitrary?: fc.Arbitrary<number>,
): fc.Arbitrary<number[]> =>
  fc.uniqueArray(arbitrary ?? fc_num(), {
    minLength: count,
    maxLength: count,
    comparator: "SameValueZero",
  }).map(($) => [...new Float64Array($).sort()]);
/** Max length arbitrary. */
export const fc_max: fc.Arbitrary<number> = fc.nat({ max: 255 });
