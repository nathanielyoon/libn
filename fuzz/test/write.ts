import { save } from "@libn/lib";

await fetch("https://www.rfc-editor.org/rfc/rfc9839.txt").then(($) => $.text())
  .then(($) => ({
    normalize: {
      uncode: $.slice(14538, 15597).match(/(?<=%x)\w+(?:-\w+)?/g)!.map((hex) =>
        hex.length === 1
          ? parseInt(hex, 16)
          : hex.split("-").map(($) => parseInt($, 16))
      ),
    },
  })).then(save(import.meta));
