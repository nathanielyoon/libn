import { en } from "@libn/base/utf";

/** Replaces lone surrogates. */
export const unlone = ($: string): string => $.replace(/\p{Cs}/gu, "\ufffd");
/** Restricts to Unicode Assignables (RFC9839.4.3). */
export const uncode = ($: string): string =>
  $.replace(
    /[\x00-\x08\x0b\x0c\x0e-\x1f\x7f-\x9f\p{Cs}\ufdd0-\ufdef\ufffe\uffff\u{1fffe}\u{1ffff}\u{2fffe}\u{2ffff}\u{3fffe}\u{3ffff}\u{4fffe}\u{4ffff}\u{5fffe}\u{5ffff}\u{6fffe}\u{6ffff}\u{7fffe}\u{7ffff}\u{8fffe}\u{8ffff}\u{9fffe}\u{9ffff}\u{afffe}\u{affff}\u{bfffe}\u{bffff}\u{cfffe}\u{cffff}\u{dfffe}\u{dffff}\u{efffe}\u{effff}\u{ffffe}\u{fffff}\u{10fffe}\u{10ffff}]/gu,
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
const b1 = ($: string) => `\\${"tnvfr"[en.call($) - 9]}`; // \x09-\x0d
const h2 = ($: string) => `\\x${en.call($).toString(16).padStart(2, "0")}`;
const u4 = ($: string) => `\\u${en.call($).toString(16).padStart(4, "0")}`;
/** Escapes a string as a regular expression literal. */
export const unrexp = ($: string): string =>
  $.replace(/[$(-+./?[-^{|}]/g, "\\$&").replace(/[\t\n\v\f\r]/g, b1)
    .replace(/[\0-#%&',\-:->@_`~\x7f\x85\xa0]|^[\dA-Za-z]/g, h2)
    .replace(/[\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\uffef]/g, u4);
