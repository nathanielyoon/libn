import { get, set, zip } from "../test.ts";

const [rfc9839, fold] = await Promise.all([
  get`www.rfc-editor.org/rfc/rfc9839.txt${14538}${15597}`,
  get`www.unicode.org/Public/UNIDATA/CaseFolding.txt${2990}${87528}`,
]);

await set(import.meta, {
  uncode: (await zip(
    new Uint8Array(
      rfc9839.match(/(?<=%x)\w+(?:-\w+)?/g)!.reduce((to, hex) => {
        const range = hex.split("-").map(($) => parseInt($, 16));
        if (range.length === 1) to[range[0]] = range[0];
        else for (let z = range[0]; z <= range[1]; ++z) to[z] = z;
        return to;
      }, new Uint32Array(0x110000).fill(0xfffd)).buffer,
    ),
    new CompressionStream("gzip"),
  )).toBase64(),
  uncase: fold.matchAll(/^([\dA-F]{4,}); [CF]; ([^;]+)/gm).reduce((to, $) => [
    to[0] + String.fromCodePoint(parseInt($[1], 16)),
    $[2].split(" ").reduce(
      (mapping, hex) => mapping + String.fromCodePoint(parseInt(hex, 16)),
      to[1],
    ),
  ], ["", ""]),
}, "66d3266a7857ccca0956d725aa572d2866ccf53472639d21baea713b3f6756ab");
