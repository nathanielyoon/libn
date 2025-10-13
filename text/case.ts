import { dePoint, enPoint } from "./lib.ts";
import ranges from "./ranges.json" with { type: "json" };

/** Fetches the Unicode case-folding source. */
export const source = async (): Promise<string> =>
  (await fetch("https://unicode.org/Public/UNIDATA/CaseFolding.txt")).text();
/** Creates a case-folding range set from the Unicode source text. */
export const createRanges = (text: string) => {
  let head = -1;
  return text.match(/^.{4,5}; [CF];(?: [\dA-F]{4,5})+/gm)!.reduce((out, $) => {
    const line = $.split(/; [CF]; /), set = line[1].split(" ");
    let all = "";
    for (let y = 0; y < set.length; ++y) all += dePoint(parseInt(set[y], 16));
    const code = parseInt(line[0], 16), prev = out[out.length - 1];
    if (code < head + prev?.length) prev.push(all);
    else out.push([dePoint(head = code), all]);
    return out;
  }, [] as string[][]).map(($) => $.join(" ")).join(",");
};
const regex = /* @__PURE__ */ (() => {
  const hex = ($: number) => {
    if ($ < 256) return `\\x${$.toString(16).padStart(2, "0")}`;
    else if ($ < 0x10000) return `\\u${$.toString(16).padStart(4, "0")}`;
    return `\\u{${$.toString(16)}}`;
  };
  let pattern = "";
  for (const row of ranges.split(",")) {
    const [head, ...tail] = row.split(" "), code = enPoint.call(head);
    pattern += hex(code);
    const rest = tail.length - 1;
    if (rest) pattern += "-" + hex(code + rest);
  }
  return RegExp(`[${pattern}]`, "gu");
})();
const map = /* @__PURE__ */ (() => {
  const object: { [_: string]: string } = {};
  for (const row of ranges.split(",")) {
    const [head, ...tail] = row.split(" ");
    let code = enPoint.call(head);
    for (const $ of tail) object[dePoint(code++)] = $;
  }
  return Reflect.get.bind(null, object);
})();
/** Case-folds. */
export const uncase = ($: string): string => $.replace(regex, map);
