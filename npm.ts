import { build, emptyDir } from "jsr:@deno/dnt@^0.42.3";
import config from "./deno.json" with { type: "json" };

await Deno.mkdir("./npm", { recursive: true }), await emptyDir("./npm");
await build({
  entryPoints: Object.entries(config.exports).map(([name, path]) => ({
    name,
    path,
  })),
  outDir: "./npm",
  package: {
    name: config.name,
    description: "Common modules.",
    version: config.version,
    license: "GPL-3.0-or-later",
    repository: {
      type: "git",
      url: "git+https://github.com/nathanielyoon/lib.git",
    },
  },
  shims: {},
  typeCheck: false,
  test: false,
  scriptModule: false,
  skipNpmInstall: true,
});
await Deno.copyFile("./LICENSE", "./npm/LICENSE");
await Deno.copyFile("./README.md", "./npm/README.md");
