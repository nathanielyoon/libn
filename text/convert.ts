/** @module convert */
const WORD = /\p{Lu}?\p{Ll}+|\p{N}+|\p{Lu}+(?!\p{Ll})|\p{Lt}\p{Ll}*|\p{L}+/gu;
const up = ([head, ...tail]: string) =>
  head.toUpperCase() + tail.join("").toLowerCase();
const all = ($: string) => $.trim().match(WORD) ?? [];
/** Uppercases the first letter of all but the first word and concatenates. */
export const lowerCamel = ($: string): string => {
  const [head, ...tail] = all($);
  return (head ?? "").toLowerCase() + tail.map(up).join("");
};
/** Uppercases the first letter of all words and concatenates. */
export const upperCamel = ($: string): string => all($).map(up).join("");
/** Lowercases all characters and joins words with hyphens. */
export const lowerKebab = ($: string): string => all($).join("-").toLowerCase();
/** Uppercases the first letter of each word and joins words with hyphens. */
export const upperKebab = ($: string): string => all($).map(up).join("-");
/** Lowercases all characters and joins words with underscore characters. */
export const lowerSnake = ($: string): string => all($).join("_").toLowerCase();
/** Uppercases all characters and joins words with underscore characters. */
export const upperSnake = ($: string): string => all($).join("_").toUpperCase();
