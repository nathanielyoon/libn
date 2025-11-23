/** @module */
import codes from "./codes.json" with { type: "json" };

/** Converts UTF-8 to binary. */
export const enUtf8: typeof TextEncoder.prototype.encode = /* @__PURE__ */
  TextEncoder.prototype.encode.bind(/* @__PURE__ */ new TextEncoder());
/** Converts binary to UTF-8. */
export const deUtf8: typeof TextDecoder.prototype.decode = /* @__PURE__ */
  TextDecoder.prototype.decode.bind(/* @__PURE__ */ new TextDecoder("utf-8"));
/** Escapes a string as HTML text. */
export const unhtml = ($: string): string => {
  if (/^[^"&'<>]*$/.test($)) return $;
  let out = "", z = 0, y = -1;
  do switch ($.charCodeAt(z)) {
    case 34:
      out += $.slice(y + 1, y = z) + "&#34;";
      break;
    case 38:
      out += $.slice(y + 1, y = z) + "&#38;";
      break;
    case 39:
      out += $.slice(y + 1, y = z) + "&#39;";
      break;
    case 60:
      out += $.slice(y + 1, y = z) + "&#60;";
      break;
    case 62:
      out += $.slice(y + 1, y = z) + "&#62;";
      break;
  } while (++z < $.length);
  return out + $.slice(y + 1);
};
const at = ($: string) => $.codePointAt(0)!;
const x2 = ($: string) => `\\x${at($).toString(16).padStart(2, "0")}`;
const u4 = ($: string) => `\\u${at($).toString(16).padStart(4, "0")}`;
/** Escapes a string as a regular expression literal. */
export const unrexp = ($: string): string =>
  $.replace(/[$(-+./?[-^{|}]/g, "\\$&")
    .replace(/[\0-#%&',\-:->@_`~\x7f\x85\xa0]|^[\dA-Za-z]/g, x2)
    .replace(/[\u1680\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\uffef]/g, u4);
/** Replaces lone surrogates. */
export const unlone = ($: string): string => $.replace(/\p{Cs}/gu, "\ufffd");
/** Restricts to Unicode Assignables (RFC9839.4.3). */
export const uncode = ($: string): string =>
  $.replace(
    /[\0-\x08\v\f\x0e-\x1f\x7f-\x9f\p{Cs}\ufdd0-\ufdef\ufffe\uffff\u{1fffe}\u{1ffff}\u{2fffe}\u{2ffff}\u{3fffe}\u{3ffff}\u{4fffe}\u{4ffff}\u{5fffe}\u{5ffff}\u{6fffe}\u{6ffff}\u{7fffe}\u{7ffff}\u{8fffe}\u{8ffff}\u{9fffe}\u{9ffff}\u{afffe}\u{affff}\u{bfffe}\u{bffff}\u{cfffe}\u{cffff}\u{dfffe}\u{dffff}\u{efffe}\u{effff}\u{ffffe}\u{fffff}\u{10fffe}\u{10ffff}]/gu,
    "\ufffd",
  );
/** Replaces breaks with linefeeds. */
export const unline = ($: string): string =>
  $.replace(/\r\n|[\x85\u2028\u2029]/g, "\n");
/** Compatibilizes and removes diacritics. */
export const unmark = ($: string): string =>
  $.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").normalize("NFKC");
const args = /* @__PURE__ */ (() => {
  const en = ($: number) => `\\u{${$.toString(16)}}`, de = String.fromCodePoint;
  let from = "", z = 0;
  const to: { [_: string]: string } = {};
  const raw = deUtf8(Uint8Array.from(atob(codes.utf8), at));
  while (z < 1280) from += en(at(raw[z])), to[raw[z++]] = raw[z++];
  while (z < 1544) from += en(at(raw[z])), to[raw[z++]] = raw.slice(z, z += 2);
  while (z < 1608) from += en(at(raw[z])), to[raw[z++]] = raw.slice(z, z += 3);
  for (const [lower, upper, size] of codes.ranges) {
    z = size, from += `${en(lower)}-${en(lower + size)}`;
    do to[de(lower + z)] = de(upper + z); while (z--);
  }
  return { from: RegExp(`[${from}]`, "gu"), to: Reflect.get.bind(Reflect, to) };
})();
/** Case-folds. */
export const uncase = ($: string): string => $.replace(args.from, args.to);
