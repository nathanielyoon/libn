/** @internal */
import type { Has, Next } from "@libn/types";

type Letter<A extends string> = A | Lowercase<A>;
/** @internal */
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
/** @internal */
type Character = Unreserved | SubDelim | ":" | "@";
/** URL path pattern automaton. */
export interface Pattern {
  /** Empty string (not empty path, normalizes to `"/"`). */
  from: "empty";
  /** State transitions. */
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
      ["_", "proto0"],
      [string, "valid"],
    ]],
    ["proto0", [
      ["_", "proto1"],
      [string, "valid"],
    ]],
    ["proto1", [
      ["p", "proto2"],
      [string, "valid"],
    ]],
    ["proto2", [
      ["r", "proto3"],
      [string, "valid"],
    ]],
    ["proto3", [
      ["o", "proto4"],
      [string, "valid"],
    ]],
    ["proto4", [
      ["t", "proto5"],
      [string, "valid"],
    ]],
    ["proto5", [
      ["o", "proto6"],
      [string, "valid"],
    ]],
    ["proto6", [
      ["_", "proto7"],
      [string, "valid"],
    ]],
    ["proto7", [
      ["_", ""],
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
  /** An empty path, a catch-all parameter, or a non-empty segment or name. */
  exit: "first" | "name" | "valid" | `proto${0 | 1 | 2 | 3 | 4 | 5 | 6 | 7}`;
}
/** Valid URL path pattern. */
export type Path<A extends string> = Has<Pattern, A> extends true ? A : never;
/** Valid URL path pattern pattern. */
export const PATH: RegExp =
  /^(?:\/(?:[A-Za-z\d-_~!$&'()*+,;=:@]|%[\dA-Fa-f]{2})+|\/\?(?:(?!__proto__)[^/?]+|(?=$)))+$|^\/$/;
