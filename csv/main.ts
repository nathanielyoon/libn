/** Parsed CSV row. */
export type Row<A = string> = (string | A)[];
export * from "./csv.ts";
export * from "./header.ts";
