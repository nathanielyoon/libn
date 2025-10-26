import { build, emptyDir } from "@deno/dnt";

await emptyDir("./npm");
const { name, version, exports } = JSON.parse(
  await Deno.readTextFile("./deno.json"),
);
await build({
  outDir: "./npm",
  entryPoints: typeof exports === "string"
    ? [exports]
    : Object.entries<string>(exports).map(([name, path]) => ({ name, path })),
  shims: {},
  skipSourceOutput: true,
  skipNpmInstall: true,
  typeCheck: false,
  test: false,
  package: {
    name,
    version,
    license: "0BSD",
    homepage: `https://jsr.io/${name}`,
    repository: {
      type: "git",
      url: "git+https://github.com/nathanielyoon/libn.git",
    },
  },
  postBuild: async () => {
    await Deno.copyFile("../LICENSE", "./npm/LICENSE");
    await Deno.copyFile("./README.md", "./npm/README.md");
  },
});
