/** Bundles top-level side-effectual code. */
export const bundle = async (meta: ImportMeta): Promise<string> => {
  const entry = new URL(meta.resolve("./entry.ts"));
  await Deno.writeTextFile(entry, 'import "./mod.ts";\n');
  // @ts-ignore: `deno check` for workspace doesn't respect --unstable-bundle
  const result = await Deno.bundle({
    entrypoints: [entry.pathname],
    format: "esm",
    write: false,
  });
  await Deno.remove(entry);
  return result.outputFiles![0].text();
};
