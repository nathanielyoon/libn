/** Replaces lone surrogates. */
export const unlone = ($: string): string => $.replace(/\p{Cs}/gu, "\ufffd");
/** Restricts to Unicode Assignables (RFC9839 4.3). */
export const uncode = ($: string): string =>
  $.replace(
    /[^\t\n\r -~\xa0-\ud7ff\ue000-\ufdcf\ufdf0-\ufffd\u{10000}-\u{1FFFD}\u{20000}-\u{2FFFD}\u{30000}-\u{3FFFD}\u{40000}-\u{4FFFD}\u{50000}-\u{5FFFD}\u{60000}-\u{6FFFD}\u{70000}-\u{7FFFD}\u{80000}-\u{8FFFD}\u{90000}-\u{9FFFD}\u{A0000}-\u{AFFFD}\u{B0000}-\u{BFFFD}\u{C0000}-\u{CFFFD}\u{D0000}-\u{DFFFD}\u{E0000}-\u{EFFFD}\u{F0000}-\u{FFFFD}\u{100000}-\u{10FFFD}]+/u,
    "\ufffd",
  );
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
