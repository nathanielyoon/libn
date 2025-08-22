import { build, emptyDir } from "jsr:@deno/dnt@^0.42.3";

await Deno.mkdir("./npm", { recursive: true });
await emptyDir("./npm");
const { exports, name, version } =
  (await import("./deno.json", { with: { type: "json" } })).default;
await build({
  entryPoints: Object.entries(exports).map(([name, path]) => ({
    name,
    path,
  })),
  outDir: "./npm",
  package: {
    name,
    description: "Common modules.",
    version,
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
