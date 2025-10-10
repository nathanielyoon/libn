/** Type-determining options. */
export interface CsvOptions<A extends {} | null> {
  /**
   * Whether to assume all rows are the same length.
   *
   * @default true
   */
  eager?: boolean;
  /**
   * Interpretation of empty fields (e.g. between two delimiters).
   *
   * @default { value: null, check: ($) => $ === null }
   */
  empty?: { value?: A; check?: ($: string | A) => $ is A };
}
/** CSV row, with empty fields replaced by a generic value. */
export type Row<A extends {} | null> = readonly (string | A)[];
