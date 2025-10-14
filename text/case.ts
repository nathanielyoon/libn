import { dePoint, enPoint } from "./lib.ts";
import ranges from "./ranges.json" with { type: "json" };

/** Creates a case-folding range set from the Unicode source text. */
export const createRanges = (text: string): string => {
  let head = -1;
  return text.match(/^.{4,5}; [CF];(?: [\dA-F]{4,5})+/gm)!.reduce((out, $) => {
    const line = $.split(/; [CF]; /), to = line[1].split(" ");
    let next = "";
    for (let y = 0; y < to.length; ++y) next += dePoint(parseInt(to[y], 16));
    const code = parseInt(line[0], 16), prev = out[out.length - 1];
    if (code < head + prev?.length) prev.push(next);
    else out.push([dePoint(head = code), next]);
    return out;
  }, [] as string[][]).map(($) => $.join(" ")).join(",");
};
const replace = /* @__PURE__ */ (() => String.prototype.replace)();
const args = /* @__PURE__ */ ((): Parameters<typeof replace> => {
  const hex = ($: number) => {
    if ($ < 256) return `\\x${$.toString(16).padStart(2, "0")}`;
    else if ($ < 0x10000) return `\\u${$.toString(16).padStart(4, "0")}`;
    return `\\u{${$.toString(16)}}`;
  };
  const map: { [_: string]: string } = {};
  let regex = "";
  for (const row of ranges.split(",")) {
    const [head, ...tail] = row.split(" "), rest = tail.length - 1;
    let code = enPoint.call(head);
    regex += hex(code);
    if (rest) regex += "-" + hex(code + rest);
    for (const $ of tail) map[dePoint(code++)] = $;
  }
  return [RegExp(`[${regex}]`, "gu"), Reflect.get.bind(null, map)];
})();
/** Case-folds. */
export const uncase = ($: string): string => replace.apply($, args);
