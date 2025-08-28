import { get_rfc, write_vectors } from "@nyoon/test";

await write_vectors(import.meta, async () => ({
  rfc4648: await get_rfc(4648, 25691, 26723).then((text) =>
    ["16", "32", "32-hex", "64", "64url"].reduce((to, base) => ({
      ...to,
      [`base${base.replace("-", "")}`]: text.matchAll(
        RegExp(`^ {3}BASE${base.toUpperCase()}\\("(.*)"\\) = "(.*)"$`, "gm"),
      ).map(([_, ascii, binary]) => ({
        ascii,
        binary: base === "16"
          ? binary.toLowerCase()
          : base === "64"
          ? binary
          : binary.replace(/=+$/, ""),
      })).toArray(),
    }), {})
  ),
}));
