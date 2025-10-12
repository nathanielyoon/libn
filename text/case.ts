import { dePoint, enPoint } from "./lib.ts";
import ranges from "./ranges.json" with { type: "json" };

/** Fetches the Unicode case-folding source. */
export const source = async (): Promise<string> =>
  (await fetch("https://unicode.org/Public/UNIDATA/CaseFolding.txt")).text();
/** Creates a case-folding range set from the Unicode source text. */
export const createRanges = (text: string): { [_: string]: string[] } => {
  let head = "";
  return text.match(/^.{4,5}; [CF];(?: [\dA-F]{4,5})+/gm)!.reduce((out, $) => {
    const line = $.split(/; [CF]; /), set = line[1].split(" ");
    let all = "";
    for (let y = 0; y < set.length; ++y) all += dePoint(parseInt(set[y], 16));
    const code = parseInt(line[0], 16), prev = out[head];
    if (code === enPoint.call(head) + prev?.length) prev.push(all); // continues
    else out[head = dePoint(code)] = [all]; // disjoint, start new range
    return out;
  }, {} as { [_: string]: string[] });
};
const regex = /* @__PURE__ */ (() => {
  const hex = ($: number) => {
    if ($ < 256) return `\\x${$.toString(16).padStart(2, "0")}`;
    else if ($ < 0x10000) return `\\u${$.toString(16).padStart(4, "0")}`;
    return `\\u{${$.toString(16)}}`;
  };
  let pattern = "";
  for (const range of Object.entries(ranges)) {
    const code = enPoint.call(range[0]), rest = range[1].length - 1;
    pattern += hex(code), rest && (pattern += "-" + hex(code + rest));
  }
  return RegExp(`[${pattern}]`, "gu");
})();
const map = /* @__PURE__ */ (() => {
  const object: { [_: string]: string } = {};
  for (const range of Object.entries(ranges)) {
    let code = enPoint.call(range[0]);
    for (const $ of range[1]) object[dePoint(code++)] = $;
  }
  return Reflect.get.bind(null, object);
})();
/** Case-folds. */
export const uncase = ($: string): string => $.replace(regex, map);
