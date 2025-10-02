/** Runs benchmarks. */
export const bench = <
  A extends Omit<Deno.BenchDefinition, "name" | "fn" | "baseline"> & {
    group: string;
  },
>(group: A, $: {
  [name: string]:
    | Deno.BenchDefinition["fn"]
    | Omit<Deno.BenchDefinition, "name" | keyof A> & {
      fn: Deno.BenchDefinition["fn"];
    };
}): void => {
  if (Deno.args.length && !Deno.args.includes(group.group)) return;
  for (const [key, value] of Object.entries($)) {
    Deno.bench({
      name: key,
      ...group,
      ...(typeof value === "function" ? { fn: value } : value),
    });
  }
};
