/** @module utf */
import codes from "./codes.json" with { type: "json" };

/** Converts UTF-8 to binary. */
export const enUtf8: typeof TextEncoder.prototype.encode =
  /* @__PURE__ */ TextEncoder.prototype.encode.bind(
    /* @__PURE__ */ new TextEncoder(),
  );
/** Converts binary to UTF-8. */
export const deUtf8: typeof TextDecoder.prototype.decode =
  /* @__PURE__ */ TextDecoder.prototype.decode.bind(
    /* @__PURE__ */ new TextDecoder("utf-8"),
  );
/** Escapes a string of HTML. */
export const unhtml = ($: string): string =>
  $.replaceAll("&", "&#38;").replaceAll('"', "&#34;").replaceAll("'", "&#39;")
    .replaceAll("<", "&#60;").replaceAll(">", "&#62;");
const at = ($: string) => $.codePointAt(0)!;
const b1 = ($: string) => `\\${"tnvfr"[at($) - 9]}`; // \x09-\x0d
const h2 = ($: string) => `\\x${at($).toString(16).padStart(2, "0")}`;
const u4 = ($: string) => `\\u${at($).toString(16).padStart(4, "0")}`;
/** Escapes a string as a regular expression literal. */
export const unrexp = ($: string): string =>
  $.replace(/[$(-+./?[-^{|}]/g, "\\$&").replace(/[\t\n\v\f\r]/g, b1)
    .replace(/[\0-#%&',\-:->@_`~\x7f\x85\xa0]|^[\dA-Za-z]/g, h2)
    .replace(/[\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\uffef]/g, u4);
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
/** Compatibilizes and removes diacritics. */
export const unmark = ($: string): string =>
  $.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").normalize("NFKC");
const args = /* @__PURE__ */ (() => {
  const hex = ($: number) => `\\u{${$.toString(16)}}`;
  let regex = "";
  const map: { [_: string]: string } = {};
  for (const [code, mapping, length] of codes.ranges) {
    regex += `${hex(code)}-${hex(code + length)}`;
    for (let z = 0; z <= length; ++z) {
      map[String.fromCodePoint(code + z)] = String.fromCodePoint(mapping + z);
    }
  }
  const bytes = Uint8Array.from(atob(codes.utf8), at);
  let use: string[] = [];
  for (const $ of deUtf8(bytes.subarray(0, 3214))) {
    if (use.length) {
      regex += hex(at(use[0])), map[use[0]] = $, use = [];
    } else use.push($);
  }
  for (const $ of deUtf8(bytes.subarray(3214, 3854))) {
    if (use.length === 2) {
      regex += hex(at(use[0])), map[use[0]] = use[1] + $, use = [];
    } else use.push($);
  }
  for (const $ of deUtf8(bytes.subarray(3854))) {
    if (use.length === 3) {
      regex += hex(at(use[0])), map[use[0]] = use[1] + use[2] + $, use = [];
    } else use.push($);
  }
  return [RegExp(`[${regex}]`, "gu"), Reflect.get.bind(Reflect, map)] as const;
})();
/** Case-folds. */
export const uncase = ($: string): string => $.replace(...args);
