// deno-coverage-ignore-file
type Json = null | boolean | number | string | Json[] | { [key: string]: Json };
/** Fetches, parses, and writes test data to an adjacent `vectors.json` file. */
export const vectors =
  (async (meta: ImportMeta, $: string | number, use: ($: any) => Json) =>
    meta.main &&
    (typeof $ === "string"
      ? (await fetch(`https://raw.githubusercontent.com/${$}.json`)).json()
      : (await fetch(`https://www.rfc-editor.org/rfc/rfc${$}.txt`)).text())
      .then(use).then(JSON.stringify)
      .then(Deno.writeTextFile.bind(Deno, `${meta.dirname}/vectors.json`))) as {
      (meta: ImportMeta, $: number, to: ($: string) => Json): Promise<void>;
      <A = any>(meta: ImportMeta, $: string, to: ($: A) => Json): Promise<void>;
    };
