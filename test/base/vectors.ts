import { get, set } from "../test.ts";

import.meta.main && await Promise.all([
  get`www.rfc-editor.org/rfc/rfc4648.txt${25691}${26723}`,
]).then(([rfc4648]) =>
  set(import.meta.resolve("./vectors.json"), {
    ...([
      ["16", true],
      ["32", false],
      ["32-HEX", false, "h32"],
      ["64", true],
      ["64", false, "u64"],
    ] as const).reduce((to, [base, pad, key]) => ({
      ...to,
      [key ?? `b${base}`]: Array.from(
        rfc4648.matchAll(RegExp(`BASE${base}\\("(.*)"\\) = "(.*)"`, "g")),
        ([_, binary, string]) => ({
          binary,
          string: pad ? string : string.replace(/=+$/, ""),
        }),
      ),
    }), {}),
  }, "gYpv8cXPsO2/OVTjOLgIhSwLi5tESAYGdwNsHbQzMRA=")
);
