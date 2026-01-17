import { build, emptyDir } from "@deno/dnt";
import root from "./deno.json" with { type: "json" };

const shim = `Uint8Array.prototype.toHex ??= function () {
  return this.reduce((to, byte) => to + byte.toString(16).padStart(2, "0"), "");
};
Uint8Array.fromHex ??= (hex) =>
  Uint8Array.from(hex.match(/../g) ?? [], (byte) => parseInt(byte, 16));
Uint8Array.prototype.toBase64 ??= function (options) {
  let out = btoa(this.reduce((to, code) => to + String.fromCharCode(code), ""));
  if (options?.alphabet === "base64url") {
    out = out.replaceAll("+", "-").replaceAll("/", "_");
  }
  if (options?.omitPadding) out = out.replace(/=+$/, "");
  return out;
};
Uint8Array.fromBase64 ??= (base64, options) =>
  Uint8Array.from(
    atob(
      options?.alphabet === "base64url"
        ? base64.replaceAll("-", "+").replaceAll("_", "/")
        : base64,
    ),
    (char) => char.charCodeAt(0),
  );
`;
const [config] = await Promise.all([
  Deno.readTextFile("./deno.json"),
  emptyDir("./npm"), // creates if needed
]);
const { name, version, exports, compilerOptions = {} } = JSON.parse(config);
const directory = name.slice(name.indexOf("/") + 1);
await build({
  outDir: "./npm",
  entryPoints: typeof exports === "string"
    ? [exports]
    : Object.entries<string>(exports).map(([name, path]) => ({ name, path })),
  shims: { deno: "dev" },
  skipSourceOutput: true,
  typeCheck: "both",
  compilerOptions: {
    ...root.compilerOptions,
    ...compilerOptions,
    lib: compilerOptions.lib?.filter(
      RegExp.prototype.test.bind(/^(?!deno|esnext)/i),
    ) ?? ["ESNext"],
  },
  filterDiagnostic: ($) => !/\/jsr\.io|test\.ts$/.test($.file?.fileName ?? ""),
  package: {
    name,
    version,
    license: root.license,
    homepage: `https://jsr.io/${name}`,
    repository: {
      type: "git",
      url: "git+https://github.com/nathanielyoon/libn.git",
      directory,
    },
  },
  postBuild: async () =>
    void await Promise.all(["esm", "script"].map(async (type: string) => {
      let path = `./npm/${type}/test.js`;
      const text = await Deno.readTextFile(path).catch((thrown) => {
        if (!(thrown instanceof Deno.errors.NotFound)) throw thrown;
        return Deno.readTextFile(path = `./npm/${type}/${directory}/test.js`);
      });
      await Deno.writeTextFile(path, shim + text);
    })),
});
await Promise.all([
  Deno.copyFile(new URL(import.meta.resolve("./LICENSE")), "./npm/LICENSE"),
  Deno.copyFile("./README.md", "./npm/README.md"),
  new Deno.Command("bun", {
    args: ["run", "./npm/test_runner.js"],
    stdout: "inherit",
    stderr: "inherit",
  }).output(),
]);
