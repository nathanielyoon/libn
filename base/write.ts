import { save } from "@libn/lib";

await fetch("https://www.rfc-editor.org/rfc/rfc4648")
  .then(($) => $.text())
  .then((rfc4648) => ({
    rfc4648: ["16", "32", "32-hex", "64", "64url"].reduce((to, base) => ({
      ...to,
      [`base${base.replace("-", "")}`]: rfc4648.matchAll(RegExp(
        `^ {3}BASE${
          base.replace("url", "").toUpperCase()
        }\\("(.*)"\\) = "(.*)"$`,
        "gm",
      )).map(([_, ascii, binary]) => ({
        ascii,
        binary: base === "16"
          ? binary.toLowerCase()
          : base === "64"
          ? binary
          : binary.replace(/=+$/, ""),
      })).toArray(),
    }), {}),
  }))
  .then(save(import.meta));
