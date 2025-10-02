/** Replaces lone surrogates. */
export const unlone = ($: string): string => $.replace(/\p{Cs}/gu, "\ufffd");
/** Restricts to Unicode Assignables (RFC9839 4.3) + surrogates for UTF-16. */
export const uncode = ($: string): string =>
  $.replace(/[^\t\n\r -~\xa0-\ufdcf\ufdf0-\ufffd]+/, "\ufffd");
/** Replaces breaks with linefeeds. */
export const unline = ($: string): string =>
  $.replace(/\r\n|\u2028|\u2029/g, "\n");
/** Removes leading/trailing whitespace and collapses whitespace sequences. */
export const unwide = ($: string): string =>
  $.trim().replace(/([\s\x85])[\s\x85]+/g, "$1");
/** Compatibilizes and removes diacritics. */
export const unmark = ($: string): string =>
  $.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
/** Case-folds. */
export const uncase = ($: string): string => $.toLowerCase().toUpperCase();
