/** @module */
import codes from "./codes.json" with { type: "json" };

/** Converts UTF-8 to binary. */
export const untext: typeof TextEncoder.prototype.encode = /* @__PURE__ */
  TextEncoder.prototype.encode.bind(/* @__PURE__ */ new TextEncoder());

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
  const at = ($: string) => $.codePointAt(0)!;
  const en = ($: number) => `\\u{${$.toString(16)}}`, de = String.fromCodePoint;
  let from = "", z = 0;
  const to: { [_: string]: string } = {};
  const raw = new TextDecoder().decode(Uint8Array.from(atob(codes.utf8), at));
  while (z < 1280) from += en(at(raw[z])), to[raw[z++]] = raw[z++];
  while (z < 1544) from += en(at(raw[z])), to[raw[z++]] = raw.slice(z, z += 2);
  while (z < 1608) from += en(at(raw[z])), to[raw[z++]] = raw.slice(z, z += 3);
  for (let [start, offset, size] of codes.ranges) {
    from += `${en(start)}-${en(start + size)}`;
    do to[de(start + size)] = de(start + offset + size); while (size--);
  }
  return { from: RegExp(`[${from}]`, "gu"), to: Reflect.get.bind(Reflect, to) };
})();
/** Case-folds. */
export const uncase = ($: string): string => $.replace(args.from, args.to);
