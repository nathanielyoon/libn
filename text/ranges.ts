import { dePoint, enPoint } from "./lib.ts";

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
