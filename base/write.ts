import { save, trim } from "@libn/lib";

Promise.all([
  fetch("https://www.rfc-editor.org/rfc/rfc4648.txt").then(async ($) =>
    (await $.text()).slice(25691, 26723)
  ),
  fetch(
    "https://raw.githubusercontent.com/zeromq/rfc/3d4c0cef87ed761fe09ab9abf8a6e5ea45df0e9f/src/spec_32.c",
  ).then(async ($) => (await $.text()).slice(4717, 7474)),
]).then(([rfc4648, z85]) => ({
  ...[["16"], ["32", "32-hex"], ["64", "64url"]].reduce((to, bases) => ({
    ...to,
    [bases[0]]: {
      rfc4648: bases.map((base) =>
        Array.from(
          rfc4648.matchAll(RegExp(
            `^ {3}BASE${
              base.replace("url", "").toUpperCase()
            }\\("(.*)"\\) = "(.*)"$`,
            "gm",
          )),
          ([_, ascii, binary]) => ({
            ascii,
            binary: base === "16"
              ? binary.toLowerCase()
              : base === "64"
              ? binary
              : binary.replace(/=+$/, ""),
          }),
        )
      ),
    },
  }), {}),
  85: {
    spec_32: Array.from(
      [1, 2],
      ($) => {
        const [_, bytes, encoded] = RegExp(
          `byte test_data_${$} \\[\\d+\\] = \\{(.+?)\\};.*?encoded = Z85_encode \\(test_data_${$}.*?assert \\(streq \\(encoded, "(.+?)"\\)\\)`,
          "s",
        ).exec(z85)!;
        return { bytes: trim(bytes.toLowerCase()), encoded };
      },
    ),
  },
})).then(save(import.meta));
