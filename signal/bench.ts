import fc from "fast-check";
import { fc_bench } from "@libn/lib";
import {
  batch,
  derive,
  effect,
  type Getter,
  type Setter,
  signal,
} from "./mod.ts";
import * as alien from "alien-signals";
import { reactive, stabilize } from "@reactively/core";

/** Framework definition. */
export interface Framework {
  /** Name of framework. */
  name: string;
  /** Data source. */
  signal: <A>($: A) => { get: Getter<A>; set: Setter<A> };
  /** Derived computation. */
  derive: <A>($: () => A) => { get: Getter<A> };
  /** Side effect. */
  effect: ($: () => void) => void;
  /** Batch updater. */
  batch: ($: () => void) => void;
}
/** Test configuration. */
export interface Test {
  /** Name of test. */
  name: string;
  /** Size of each layer. */
  width: number;
  /** Number of derived layers. */
  depth: number;
  /** Number of sources per node. */
  girth: number;
  /** Fraction of nodes whose dependencies may change. */
  fraction_set: number;
  /** Fraction of last-layer elements to read from. */
  fraction_get: number;
  /** Number of test iterations. */
  iterations: number;
}
interface Graph {
  head: { get: Getter<number>; set: Setter<number> }[];
  body: { get: Getter<number> }[][];
}
type Counter = { count: number };
const create_graph = (
  random_fraction: () => number,
  framework: Framework,
  test: Test,
  counter: Counter,
) => {
  const head = Array<{ get: Getter<number>; set: Setter<number> }>(test.width);
  for (let z = 0; z < head.length; ++z) head[z] = framework.signal(z);
  let previous: { get: Getter<number> }[] = head;
  const body = Array<{ get: Getter<number> }[]>(test.depth);
  for (let z = 0; z < body.length; ++z) {
    const row = body[z] = Array<{ get: Getter<number> }>(test.width);
    for (let y = 0; y < row.length; ++y) {
      const node = Array<{ get: Getter<number> }>(test.girth);
      for (let x = 0; x < node.length; ++x) {
        node[x] = previous[(y + x) % previous.length];
      }
      if (random_fraction() / 0x100000000 > test.fraction_set) {
        row[y] = framework.derive(() => {
          ++counter.count;
          let sum = 0;
          for (let w = 0; w < node.length; ++w) sum += node[w].get();
          return sum;
        });
      } else {
        const head = node[0], tail = node.slice(1);
        row[y] = framework.derive(() => {
          ++counter.count;
          let sum = head.get();
          const drop = sum & 1 ? sum % tail.length : -1;
          for (let z = 0; z < tail.length; ++z) {
            if (z !== drop) sum += tail[z].get();
          }
          return sum;
        });
      }
    }
    previous = row;
  }
  return { head, body } satisfies Graph;
};
const run_graph = (
  random_natural: () => number,
  framework: Framework,
  test: Test,
  graph: Graph,
) => {
  const leaves = graph.body[graph.body.length - 1].slice();
  const skips = leaves.length * (1 - test.fraction_get);
  for (let z = 0; z < skips; ++z) {
    leaves.splice(random_natural() % leaves.length, 1);
  }
  let sum = 0;
  framework.batch(() => {
    for (let z = 0; z < test.iterations; ++z) {
      const index = z % graph.head.length;
      graph.head[index].set(z + index);
      for (let y = 0; y < leaves.length; ++y) leaves[y].get();
    }
    for (let z = 0; z < leaves.length; ++z) sum += leaves[z].get();
  });
  return sum;
};
const TESTS: Test[] = [
  {
    name: "static",
    width: 10,
    depth: 10,
    girth: 10,
    fraction_set: 1,
    fraction_get: 1,
    iterations: 100,
  },
  {
    name: "dynamic",
    width: 10,
    depth: 10,
    girth: 10,
    fraction_set: .75,
    fraction_get: .25,
    iterations: 100,
  },
  {
    name: "width-static",
    width: 100,
    depth: 5,
    girth: 5,
    fraction_set: 1,
    fraction_get: 1,
    iterations: 1,
  },
  {
    name: "width-dynamic",
    width: 100,
    depth: 5,
    girth: 5,
    fraction_set: .75,
    fraction_get: .25,
    iterations: 1,
  },
  {
    name: "depth-static",
    width: 5,
    depth: 100,
    girth: 5,
    fraction_set: 1,
    fraction_get: 1,
    iterations: 100,
  },
  {
    name: "depth-dynamic",
    width: 5,
    depth: 100,
    girth: 5,
    fraction_set: .75,
    fraction_get: .25,
    iterations: 100,
  },
  {
    name: "girth-static",
    width: 5,
    depth: 5,
    girth: 100,
    fraction_set: 1,
    fraction_get: 1,
    iterations: 1,
  },

  {
    name: "girth-dynamic",
    width: 5,
    depth: 5,
    girth: 100,
    fraction_set: .75,
    fraction_get: .25,
    iterations: 1,
  },
];
const FRAMEWORKS: Framework[] = [
  {
    name: "libn",
    signal: ($) => {
      const get_set = signal($);
      return { get: get_set, set: get_set };
    },
    derive: ($) => ({ get: derive($) }),
    effect,
    batch,
  },
  {
    name: "alien",
    signal: ($) => {
      const get_set = alien.signal($);
      return { get: get_set, set: get_set };
    },
    derive: ($) => ({ get: alien.computed($) }),
    effect: alien.effect,
    batch: ($) => {
      alien.startBatch();
      try {
        $();
      } finally {
        alien.endBatch();
      }
    },
  },
  {
    name: "reactively",
    signal: reactive as any,
    derive: reactive,
    effect: ($) => reactive($, { effect: true }),
    batch: ($) => ($(), stabilize()),
  },
];
for (const test of TESTS) {
  fc_bench(
    { group: test.name, runs: 1 },
    fc.tuple(fc.gen()),
    FRAMEWORKS.reduce((to, framework) => ({
      ...to,
      [framework.name]: (gen: fc.GeneratorValue) => {
        const counter = { count: 0 };
        const graph = create_graph(
          () => gen(fc.double, { min: 0, max: 1 }),
          framework,
          test,
          counter,
        );
        const sum = run_graph(() => gen(fc.nat), framework, test, graph);
        return { sum, count: counter.count };
      },
    }), {}),
  );
}
