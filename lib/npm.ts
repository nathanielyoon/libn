import { build, emptyDir } from "@deno/dnt";

await emptyDir("./npm");
await Deno.mkdir("./npm/esm");
const { name, version, license, exports } = JSON.parse(
  await Deno.readTextFile("./deno.json"),
);
await Deno.writeTextFile(
  "./npm/esm/test.js",
  `Uint8Array.prototype.toHex ??= function (this) {
  return this.reduce((hex, $) => hex + $.toString(16).padStart(2, "0"), "");
};
Uint8Array.fromHex ??= ($) =>
  Uint8Array.from($.match(/../g) ?? [], ($) => parseInt($, 16));
Uint8Array.prototype.toBase64 ??= function (this, options) {
  let base64 = btoa(this.reduce((to, $) => to + String.fromCharCode($), ""));
  if (options?.omitPadding) base64 = base64.replace(/=+$/, "");
  if (options?.alphabet === "base64url") {
    base64 = base64.replaceAll("+", "-").replaceAll("/", "_");
  }
  return base64;
};
Uint8Array.fromBase64 ??= ($, options) =>
  Uint8Array.from(
    atob(
      options?.alphabet === "base64"
        ? $
        : $.replaceAll("-", "+").replaceAll("_", "/"),
    ),
    ($) => $.charCodeAt(0),
  );

import "./src/test.js";`,
  {
    create: true,
  },
);
await build({
  outDir: "./npm",
  entryPoints: typeof exports === "string"
    ? [exports]
    : Object.entries<string>(exports).map(([name, path]) => ({ name, path })),
  package: {
    name,
    version,
    license,
    repository: {
      type: "git",
      url: "git+https://github.com/nathanielyoon/libn.git",
    },
  },
  scriptModule: false,
  shims: { deno: "dev", crypto: "dev" },
  typeCheck: false,
  postBuild: async () => {
    await Deno.copyFile("./README.md", "./npm/README.md");
    await Deno.copyFile("../LICENSE", "./npm/LICENSE");
  },
});
