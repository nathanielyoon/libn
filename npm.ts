import { build, emptyDir } from "jsr:@deno/dnt@^0.42.3";

await emptyDir("./npm");
await build({
  entryPoints: [
    { name: "./alien-signals", path: "./alien-signals/main.ts" },
    { name: "./base", path: "./base/main.ts" },
    { name: "./crypto", path: "./crypto/main.ts" },
    { name: "./csv", path: "./csv/main.ts" },
    { name: "./fp", path: "./fp.ts" },
    { name: "./match", path: "./match/main.ts" },
    { name: "./query", path: "./query.ts" },
    { name: "./schema", path: "./schema/main.ts" },
    { name: "./vite-plugin-inline", path: "./vite-plugin-inline.ts" },
  ],
  outDir: "./npm",
  shims: {},
  package: {
    name: "@nyoon/lib",
    description: "Common modules.",
    version:
      (await import("./deno.json", { with: { type: "json" } })).default.version,
    license: "GPL-3.0-or-later",
    repository: {
      type: "git",
      url: "git+https://github.com/nathanielyoon/lib.git",
    },
  },
  typeCheck: false,
  test: false,
  scriptModule: false,
});

await Deno.copyFile(
  import.meta.resolve("./LICENSE").slice(7),
  import.meta.resolve("./npm/LICENSE").slice(7),
);
await Deno.copyFile(
  import.meta.resolve("./README.md").slice(7),
  import.meta.resolve("./npm/README.md").slice(7),
);
