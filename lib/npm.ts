import { build, emptyDir } from "@deno/dnt";

await emptyDir("./npm");
const { name, version, license, exports } = JSON.parse(
  await Deno.readTextFile("./deno.json"),
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
  shims: {},
  skipNpmInstall: true,
  typeCheck: false,
  test: false,
  postBuild: async () => {
    await Deno.copyFile("./README.md", "./npm/README.md");
    await Deno.copyFile("../LICENSE", "./npm/LICENSE");
  },
});
