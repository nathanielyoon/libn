import { en } from "@libn/base";

/** Replaces lone surrogates. */
export const unlone = ($: string): string => $.replace(/\p{Cs}/gu, "\ufffd");
/** Restricts to Unicode Assignables (RFC9839.4.3). */
export const uncode = ($: string): string =>
  $.replace(
    /[^\t\n\r -~\xa0-\ud7ff\ue000-\ufdcf\ufdf0-\ufffd\u{10000}-\u{1fffd}\u{20000}-\u{2fffd}\u{30000}-\u{3fffd}\u{40000}-\u{4fffd}\u{50000}-\u{5fffd}\u{60000}-\u{6fffd}\u{70000}-\u{7fffd}\u{80000}-\u{8fffd}\u{90000}-\u{9fffd}\u{a0000}-\u{afffd}\u{b0000}-\u{bfffd}\u{c0000}-\u{cfffd}\u{d0000}-\u{dfffd}\u{e0000}-\u{efffd}\u{f0000}-\u{ffffd}\u{100000}-\u{10fffd}]/u,
    "\ufffd",
  );
/** Replaces breaks with linefeeds. */
export const unline = ($: string): string =>
  $.replace(/\r\n|[\x85\u2028\u2029]/g, "\n");
/** Removes leading/trailing whitespace and collapses repeated sequences. */
export const unwide = ($: string): string =>
  $.trim().replace(/(\r\n|\s)\1+/g, "$1");
/** Compatibilizes and removes diacritics. */
export const unmark = ($: string): string =>
  $.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").normalize("NFKC");
/** Escapes a string of HTML. */
export const unhtml = ($: string): string =>
  $.replaceAll("&", "&#38;").replaceAll('"', "&#34;").replaceAll("'", "&#39;")
    .replaceAll("<", "&#60;").replaceAll(">", "&#62;");
const b1 = ($: string) => `\\${"btnvfr"[en.call($) - 8]}`; // \x08-\x0d
const h2 = ($: string) => `\\x${en.call($).toString(16).padStart(2, "0")}`;
const u4 = ($: string) => `\\u${en.call($).toString(16).padStart(4, "0")}`;
/** Escapes a string as a regular expression literal. */
export const unrexp = ($: string): string =>
  $.replace(/[$(-+./?[-^{|}]/g, "\\$&").replace(/[\b\t\n\v\f\r]/g, b1)
    .replace(/[\0-#%&',\-:->@_`~\x7f\x85\xa0]|^[\dA-Za-z]/g, h2)
    .replace(/[\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\uffef]/g, u4);
