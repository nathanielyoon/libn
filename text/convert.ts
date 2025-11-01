/**
 * Convert between case styles.
 *
 * @example Usage
 * ```ts
 * import { assertEquals } from "@std/assert";
 *
 * let words = "This is a set of words";
 *
 * assertEquals(words = toLowerCamel(words), "thisIsASetOfWords");
 * assertEquals(words = toUpperCamel(words), "ThisIsASetOfWords");
 * assertEquals(words = toLowerKebab(words), "this-is-a-set-of-words");
 * assertEquals(words = toUpperKebab(words), "This-Is-A-Set-Of-Words");
 * assertEquals(words = toLowerSnake(words), "this_is_a_set_of_words");
 * assertEquals(words = toUpperSnake(words), "This_Is_A_Set_Of_Words");
 * ```
 *
 * @module convert
 */

const WORD = /\p{Lu}?\p{Ll}+|\p{N}+|\p{Lu}+(?!\p{Ll})|\p{Lt}\p{Ll}*|\p{L}+/gu;
const capitalize = ($: string) =>
  $ && `${$[0].toUpperCase()}${$.slice(1).toLowerCase()}`;
/** Capitalizes the first letter of all but the first word and concatenates. */
export const toLowerCamel = ($: string): string => {
  const [head, ...tail] = $.trim().match(WORD) ?? [];
  return (head ?? "").toLowerCase() + tail.map(capitalize).join("");
};
/** Capitalizes the first letter of all words and concatenates. */
export const toUpperCamel = ($: string): string =>
  $.trim().match(WORD)?.map(capitalize).join("") ?? "";
/** Lowercases all characters and joins words with hyphens. */
export const toLowerKebab = ($: string): string =>
  $.trim().match(WORD)?.join("-").toLowerCase() ?? "";
/** Uppercases the first letter of each word and joins words with hyphens. */
export const toUpperKebab = ($: string): string =>
  $.trim().match(WORD)?.map(capitalize).join("-") ?? "";
/** Lowercases all characters and joins words with underscore characters. */
export const toLowerSnake = ($: string): string =>
  $.trim().match(WORD)?.join("_").toLowerCase() ?? "";
/** Uppercases all characters and joins words with underscore characters. */
export const toUpperSnake = ($: string): string =>
  $.trim().match(WORD)?.join("_").toUpperCase() ?? "";
