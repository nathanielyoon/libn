import { build, emptyDir } from "@deno/dnt";
import config from "./deno.json" with { type: "json" };

await emptyDir("./npm");
const { name, version, exports, imports, compilerOptions = {} } = JSON.parse(
  await Deno.readTextFile("./deno.json"),
);
const test = !Object.hasOwn(imports ?? {}, "@b-fuze/deno-dom");
compilerOptions.lib &&= compilerOptions.lib.filter(($: string) =>
  !$.startsWith("deno")
);
await build({
  outDir: "./npm",
  entryPoints: typeof exports === "string"
    ? [exports]
    : Object.entries<string>(exports).map(([name, path]) => ({ name, path })),
  shims: { deno: "dev" },
  skipSourceOutput: true,
  typeCheck: false,
  compilerOptions: { ...config.compilerOptions, ...compilerOptions },
  test,
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
    test && await Promise.all(["esm", "script"].map(($) =>
      Deno.writeTextFile(
        `./npm/${$}/test.js`,
        'Uint8Array.prototype.toHex??=function(){return this.reduce((t,r)=>t+r.toString(16).padStart(2,"0"),"")};Uint8Array.fromHex??=t=>Uint8Array.from(t.match(/../g)??[],r=>parseInt(r,16));Uint8Array.prototype.toBase64??=function(t){let r=btoa(this.reduce((e,a)=>e+String.fromCharCode(a),""));return t?.alphabet==="base64url"&&(r=r.replaceAll("+","-").replaceAll("/","_")),t?.omitPadding&&(r=r.replace(/=+$/,"")),r};Uint8Array.fromBase64??=(t,r)=>Uint8Array.from(atob(r?.alphabet==="base64url"?t.replaceAll("-","+").replaceAll("_","/"):t),e=>e.charCodeAt(0));',
        { append: true },
      )
    ));
  },
});
await Deno.copyFile("../LICENSE", "./npm/LICENSE");
await Deno.copyFile("./README.md", "./npm/README.md");
test && await new Deno.Command(
  "bun",
  { args: ["run", "./npm/test_runner.js"] },
).output().then<{}>(($) => $.success || Deno.stderr.write($.stderr));
