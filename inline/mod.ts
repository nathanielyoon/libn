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
) => RegExp($.join(`(?:[^"]*?/)?${file.replace(/[$(-+./?[-^{|}]/g, "\\$&")}`));
/** Options to pass to Vite's build configuration. */
export interface Options {
  /** @default true */
  cssCodeSplit?: boolean;
  /** @default "" */
  assetsDir?: string;
  /** @default 1e9 */
  assetsInlineLimit?: number;
  /** @default 1e9 */
  chunkSizeWarningLimit?: number;
  /**
   * This should match the shape of the actual `build.rolldownOptions.output`
   * configuration (i.e. `OutputOptions` or `OutputOptions[]`). If passed an
   * object instead of an array, that `inlineDynamicImports` value will be set
   * for every member of the `output` array. If passed an array instead of an
   * object, the default will apply instead.
   *
   * @default { output: { inlineDynamicImports: true } }
   */
  rolldownOptions?: {
    output?:
      | { inlineDynamicImports?: boolean }
      | { inlineDynamicImports?: boolean }[];
  };
}
/** Updates config (unless passed `false`) and inlines assets. */
export default (build: Options | false = {}): PluginOption => ({
  name: "vite-plugin-inline",
  config: (config) => {
    if (build) {
      const a = config.build ??= {};
      a.cssCodeSplit = build.cssCodeSplit ?? false;
      a.assetsDir = build.assetsDir ?? "";
      a.assetsInlineLimit = build.assetsInlineLimit ?? 1e9;
      a.chunkSizeWarningLimit = build.chunkSizeWarningLimit ?? 1e9;
      const b = (config.build.rolldownOptions ??= {}).output ??= {};
      const c = build?.rolldownOptions?.output;
      if (Array.isArray(b)) {
        for (let z = 0; z < b.length; ++z) {
          b[z].inlineDynamicImports = (Array.isArray(c)
            ? c[z].inlineDynamicImports
            : c?.inlineDynamicImports) ?? true;
        }
      } else {
        b.inlineDynamicImports = Array.isArray(c) ||
          (c?.inlineDynamicImports ?? true);
      }
    }
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
          (_, opening, attributes, closing) =>
            `${opening}${attributes}${
              g.code.replace(/("?)__VITE_PRELOAD__\1/g, "void 0")
                .replace(/<(\/script>|!--)/g, "\\x3C$1")
            }${closing}`,
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
