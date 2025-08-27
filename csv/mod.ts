export * from "./csv.ts";
export * from "./header.ts";
/** Parsed CSV row. */
export type Row<A = string> = (string | A)[];
