import { build, emptyDir } from "@deno/dnt";

await emptyDir("./npm");
await Deno.mkdir("./npm/esm");
const { name, version, license, exports } = JSON.parse(
  await Deno.readTextFile("./deno.json"),
);
await Deno.writeTextFile("./npm/esm/test.js", 'import "./src/test.js";\n', {
  create: true,
});
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
