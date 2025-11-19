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
    ["first" | "start", [
      ["/", ""],
      ["?", "name"],
      ["%", "hex0"],
      [Character, "valid"],
    ]],
    ["name", [
      ["/" | "?", ""],
      [string, "valid"],
    ]],
    ["hex0", [
      [Hex, "hex1"],
    ]],
    ["hex1", [
      [Hex, "valid"],
    ]],
    ["valid", [
      ["/", "start"],
      [Character, "valid"],
    ]],
  ]>;
  exit: "first" | "name" | "valid";
}
/** Valid URL path pattern. */
export type Path<A extends string> = Has<Pattern, A> extends true ? A : never;
/** Valid URL path pattern pattern. */
export const PATH: RegExp =
  /^(?:\/(?:[A-Za-z\d-_~!$&'()*+,;=:@]|%[\dA-Fa-f]{2})+|\/\?(?:[^/?]+|(?=$)))+$|^\/$/;
