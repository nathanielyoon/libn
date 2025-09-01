/**
 * Inline Vite assets.
 *
 * @example Config
 * ```ts
 * import { defineConfig } from "rolldown-vite";
 * import inline from "@libn/inline";
 *
 * export default defineConfig({
 *   plugins: [inline()],
 * });
 * ```
 *
 * @module inline
 */

import type { PluginOption } from "rolldown-vite";

function assert($: unknown): asserts $ {
  if (!$) throw Error();
}
const regex = (
  $: TemplateStringsArray,
  file: string,
) => RegExp(`${$[0]}(?:[^"]*?/)?${file.replaceAll(".", "\\.")}${$[1]}`);
/** Initializes the plugin, will update config and bundle assets. */
export default (): PluginOption => ({
  name: "vite-plugin-inline",
  config: ($) => {
    ($.build ??= {}).cssCodeSplit = false, $.build.assetsDir = "";
    $.build.assetsInlineLimit = $.build.chunkSizeWarningLimit = 1e9;
    const a = ($.build.rollupOptions ??= {}).output ??= {};
    if (Array.isArray(a)) a.forEach(($) => $.inlineDynamicImports = true);
    else a.inlineDynamicImports = true;
  },
  enforce: "post",
  generateBundle(_, bundle) {
    const [a, b, c, d] = Object.keys(bundle).reduce<string[][]>((files, $) => (
      files[
        /\.(?:(html?)|([mc]?js)|(css))$/.exec($)?.findLastIndex(Boolean) ?? 0
      ].push($), files
    ), [[], [], [], []]);
    for (const other of a) this.warn(`uninlined: ${other}`);
    const e = [];
    for (const html of b) {
      const f = bundle[html];
      assert(f.type === "asset" && typeof f.source === "string");
      for (const js of c) {
        const g = bundle[js];
        assert(g.type === "chunk"), this.info(`inlining: ${js}`), e.push(js);
        f.source = f.source.replace(
          regex`(<script[^>]*?) src="${g.fileName}"([^>]*>)(</script>)`,
          (_, $1, $2, $3) =>
            `${$1}${$2}${
              g.code.replace(/("?)__VITE_PRELOAD__\1/g, "void 0")
                .replace(/<(\/script>|!--)/g, "\\x3C$1")
            }${$3}`,
        ).replace(/(<script type="module").*?\}\)\(\);/s, "$1>");
      }
      for (const css of d) {
        const g = bundle[css];
        assert(g.type === "asset"), this.info(`inlining: ${css}`), e.push(css);
        f.source = f.source.replace(
          regex`<link[^>]*? href="${g.fileName}"[^>]*>`,
          `<style>${g.source}</style>`,
        ).replace(/\s*\/\*.*?\*\/\s*/gs, "");
      }
    }
    for (const name of e) delete bundle[name];
  },
});
