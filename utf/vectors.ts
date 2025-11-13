import { get, set } from "../test.ts";

const [rfc9839, fold] = await Promise.all([
  get`www.rfc-editor.org/rfc/rfc9839.txt${14538}${15597}`,
  get`www.unicode.org/Public/UNIDATA/CaseFolding.txt${2990}${87528}`,
]);

await set(import.meta, {
  uncode: new Uint8Array(
    rfc9839.match(/(?<=%x)\w+(?:-\w+)?/g)!.reduce((to, hex) => {
      const range = hex.split("-").map(($) => parseInt($, 16));
      if (range.length === 1) to[range[0]] = range[0];
      else for (let z = range[0]; z <= range[1]; ++z) to[z] = z;
      return to;
    }, new Uint32Array(0x110000).fill(0xfffd)).buffer,
  ).toBase64({ omitPadding: true }),
  uncase: fold.matchAll(/^([\dA-F]{4,}); [CF]; ([^;]+)/gm).reduce((to, $) => [
    to[0] + String.fromCodePoint(parseInt($[1], 16)),
    $[2].split(" ").reduce(
      (mapping, hex) => mapping + String.fromCodePoint(parseInt(hex, 16)),
      to[1],
    ),
  ], ["", ""]),
}, "34cb8dc98eaa6d4e5889f286ecebe5927f0e87d372962f0bf80b598f1da72055");
