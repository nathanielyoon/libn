import { assertEquals } from "@std/assert";

type Bench = (b: Deno.BenchContext) => any;
/** Runs benchmarks. */
export const bench = <
  A extends Omit<Deno.BenchDefinition, "name" | "fn" | "baseline"> & {
    group: string;
  },
>(group: A & { assert?: boolean }, $: {
  [name: string]:
    | ((b: Deno.BenchContext) => any)
    | Omit<Deno.BenchDefinition, "name" | keyof A> & {
      fn: (b: Deno.BenchContext) => any;
      assert?: boolean;
    };
}): void => {
  if (Deno.args.length && !Deno.args.includes(group.group)) return;
  let first = true, result: any;
  for (const [key, value] of Object.entries($)) {
    const { fn, ...rest } = typeof value === "function"
      ? { fn: value, assert: true }
      : value;
    Deno.bench({ name: key, ...group, ...rest }, async (b) => {
      const actual = await fn(b);
      try {
        b.end();
      } catch (thrown) {
        if (!(thrown instanceof TypeError)) throw thrown;
      }
      if (rest.assert !== false) {
        if (group.assert === false || first) result = actual, first = false;
        else assertEquals(actual, result);
      }
    });
  }
};
