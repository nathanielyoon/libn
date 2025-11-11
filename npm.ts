import { build, emptyDir } from "@deno/dnt";
import root from "./deno.json" with { type: "json" };

const [config] = await Promise.all([
  Deno.readTextFile("./deno.json"),
  emptyDir("./npm"),
]);
const { name, version, exports, compilerOptions = {} } = JSON.parse(config);
const directory = name.slice(name.indexOf("/") + 1), lib = ["ESNext"] as const;
compilerOptions.lib &&= compilerOptions.lib
  .filter(RegExp.prototype.test.bind(/^(?!deno)/)).concat(lib);
await build({
  outDir: "./npm",
  entryPoints: typeof exports === "string"
    ? [exports]
    : Object.entries<string>(exports).map(([name, path]) => ({ name, path })),
  shims: { deno: "dev" },
  skipSourceOutput: true,
  typeCheck: "both",
  compilerOptions: { lib, ...root.compilerOptions, ...compilerOptions },
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
  postBuild: async () => {
    await Promise.all(["esm", "script"].map(async ($) => {
      const { path, text } = await Deno.readTextFile(`./npm/${$}/test.js`)
        .then((text) => ({ path: `./npm/${$}/test.js`, text }))
        .catch(async (thrown) => {
          if (!(thrown instanceof Deno.errors.NotFound)) throw thrown;
          const path = `./npm/${$}/${directory}/test.js`;
          return { path, text: await Deno.readTextFile(path) };
        });
      await Deno.writeTextFile(
        path,
        `Uint8Array.prototype.toHex??=function(){return this.reduce((t,r)=>t+r.toString(16).padStart(2,"0"),"")};Uint8Array.fromHex??=t=>Uint8Array.from(t.match(/../g)??[],r=>parseInt(r,16));Uint8Array.prototype.toBase64??=function(t){let r=btoa(this.reduce((e,a)=>e+String.fromCharCode(a),""));return t?.alphabet==="base64url"&&(r=r.replaceAll("+","-").replaceAll("/","_")),t?.omitPadding&&(r=r.replace(/=+$/,"")),r};Uint8Array.fromBase64??=(t,r)=>Uint8Array.from(atob(r?.alphabet==="base64url"?t.replaceAll("-","+").replaceAll("_","/"):t),e=>e.charCodeAt(0));${text}`,
      );
    }));
  },
});
await Promise.all([
  Deno.copyFile("../LICENSE", "./npm/LICENSE"),
  Deno.copyFile("./README.md", "./npm/README.md"),
  new Deno.Command("bun", {
    args: ["run", "./npm/test_runner.js"],
    stdout: "inherit",
    stderr: "inherit",
  }).output(), // deno-lint-ignore no-console
]), console.log();
