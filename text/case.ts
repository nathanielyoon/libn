import ranges from "./ranges.json" with { type: "json" };

/** Fetches the Unicode case folding source. */
export const source = async (): Promise<string> =>
  (await fetch("https://unicode.org/Public/UNIDATA/CaseFolding.txt")).text();
/** Creates a case-folding range set from the Unicode source text. */
export const createRanges = (text: string): { [_: string]: string[] } => {
  const lines = text.match(/^[\dA-F]{4,5}; [CF];(?: [\dA-F]{4,5})+/gm)!;
  const out: { [_: string]: string[] } = {};
  let head = "";
  for (let z = 0; z < lines.length; ++z) {
    const line = lines[z].split(/; [CF]; /), codes = line[1].split(" ");
    let mapping = "";
    for (let y = 0; y < codes.length; ++y) {
      mapping += String.fromCodePoint(parseInt(codes[y], 16));
    }
    const code = parseInt(line[0], 16), prev = out[head];
    if (code === head.codePointAt(0)! + prev?.length) prev.push(mapping);
    else out[head = String.fromCodePoint(code)] = [mapping];
  }
  return out;
};
const hex = ($: number) => {
  if ($ < 256) return `\\x${$.toString(16).padStart(2, "0")}`;
  else if ($ < 0x10000) return `\\u${$.toString(16).padStart(4, "0")}`;
  return `\\u{${$.toString(16)}}`;
};
const regex = /* @__PURE__ */ (() => {
  let pattern = "";
  for (const range of Object.entries(ranges)) {
    const code = range[0].codePointAt(0)!, rest = range[1].length - 1;
    pattern += hex(code), rest && (pattern += "-" + hex(code + rest));
  }
  return RegExp(`[${pattern}]`, "gu");
})();
const map = /* @__PURE__ */ (() => {
  const object: { [_: string]: string } = {};
  for (const range of Object.entries(ranges)) {
    let code = range[0].codePointAt(0)!;
    for (const $ of range[1]) object[String.fromCodePoint(code++)] = $;
  }
  return object;
})();
/** Case-folds. */
export const uncase = ($: string): string => $.replace(regex, ($) => map[$]);
