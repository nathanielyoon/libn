import type { Has, Next } from "@libn/types";

type Letter<A extends string> = A | Lowercase<A>;
type Hex =
  | `${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9}`
  | Letter<"A" | "B" | "C" | "D" | "E" | "F">;
type Unreserved =
  | Hex
  | Letter<
    | ("G" | "H" | "I" | "J" | "K" | "L" | "M" | "N" | "O" | "P")
    | ("Q" | "R" | "S" | "T" | "U" | "V" | "W" | "X" | "Y" | "Z")
  >
  | ("-" | "_" | "~");
type SubDelim = "!" | "$" | "&" | "'" | "(" | ")" | "*" | "+" | "," | ";" | "=";
type Character = Unreserved | SubDelim | ":" | "@";
interface Pattern {
  from: "empty";
  into: Next<[
    ["empty", [
      ["/", "first"],
    ]],
    ["first" | "/", [
      ["/", ""],
      ["?", "?"],
      ["%", "%"],
      [Character, "valid"],
    ]],
    ["?", [
      ["/" | "?", ""],
      [string, "valid"],
    ]],
    ["%", [
      [Hex, "hex"],
    ]],
    ["hex", [
      [Hex, "valid"],
    ]],
    ["valid", [
      ["/", "/"],
      [Character, "valid"],
    ]],
  ]>;
  exit: "first" | "?" | "valid";
}
/** Valid URL path. */
export type Path<A extends string> = Has<Pattern, A> extends true ? A : never;
