import { build, emptyDir } from "@deno/dnt";

if (import.meta.main) {
  const { name, version } = JSON.parse(await Deno.readTextFile("./deno.json"));
  await Deno.mkdir("./npm", { recursive: true });
  await emptyDir("./npm");
  await build({
    entryPoints: ["./mod.ts"],
    outDir: "./npm",
    package: {
      name,
      version,
      license: "GPL-3.0-or-later",
      repository: {
        type: "git",
        url: "git+https://github.com/nathanielyoon/libn.git",
      },
    },
    shims: {},
    typeCheck: false,
    test: false,
    scriptModule: false,
    skipNpmInstall: true,
  });
}
