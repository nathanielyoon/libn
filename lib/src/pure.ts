import { assertEquals } from "@std/assert";

/** Checks that a bundle is pure. */
export const pure = async (t: Deno.TestContext): Promise<void> => {
  const entry = new URL(t.origin.replace(/[^/]+$/, "entry.ts"));
  await Deno.writeTextFile(entry, 'import "../mod.ts";\n');
  // @ts-ignore: `deno check` for workspace doesn't respect --unstable-bundle
  const result = await Deno.bundle({
    entrypoints: [entry.pathname],
    format: "esm",
    write: false,
  });
  await Deno.remove(entry);
  assertEquals(result.outputFiles?.map(($) => $.text()), [""]);
};
