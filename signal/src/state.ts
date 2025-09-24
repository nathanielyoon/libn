import { Flag, Kind } from "./flags.ts";
import type { Derive, Effect, Link, Node, Scoper, Signal } from "./nodes.ts";
import { follow, ignore, update } from "./link.ts";
import { flat } from "./queue.ts";

/** Current subscriber. */
export let actor: Node | null = null;
/** Current owner. */
export let scope: Scoper | null = null;
let swapper;
/** Manually sets the current subscriber. */
export const set_actor = ($: Node | null): Node | null => (
  swapper = actor, actor = $, swapper
);
/** Manually sets the current owner. */
export const set_scope = ($: Scoper | null): Scoper | null => (
  swapper = scope, scope = $, swapper
);
/** Updates a source signal. */
export const reuse = ($: Signal): boolean => (
  $.flags = Flag.BEGIN, update($, $.prev, $.prev = $.next)
);
/** Updates a computed signal. */
export const reget = ($: Derive): boolean => {
  const a = set_actor($);
  try {
    return follow($), update($, $.prev, $.prev = $.next($.prev));
  } finally {
    actor = a, ignore($);
  }
};
const retry = ($: Node) =>
  $.kind === Kind.SIGNAL && reuse($) || $.kind === Kind.DERIVE && reget($);
/** Checks a node's dirtiness. */
export const check = (sub: Node, $: Link): boolean => {
  for (let a: (Link | null)[] = [], b = 0, c = false, d, e;;) {
    if (d = $.dep, sub.flags & Flag.DIRTY) c = true;
    else if ((d.flags & Flag.RESET) === Flag.RESET) {
      if (retry(d)) c = true, d.sub!.sub_next && flat(d.sub!);
    } else if ((d.flags & Flag.START) === Flag.START) {
      ($.sub_next || $.sub_prev) && a.push($), ++b, sub = d, $ = d.dep!;
      continue;
    }
    mid: if (c || !$.dep_next) {
      while (b--) {
        e = sub.sub!, $ = e.sub_next ? a.pop()! : e;
        if (!c) sub.flags &= ~Flag.READY;
        else if (retry(sub)) e.sub_next && flat(e), sub = $.sub;
        else if (sub = $.sub, $.dep_next) break mid;
        else c = false;
      }
      return c;
    }
    $ = $.dep_next;
  }
};
/** Runs an effect. */
export const run = ($: Node, flags: Flag) => {
  if (flags & Flag.DIRTY || flags & Flag.READY && check($, $.dep!)) {
    const a = set_actor($);
    try {
      follow($), ($ as Effect).run();
    } finally {
      set_actor(a), ignore($);
    }
  } else {
    flags & Flag.READY && ($.flags = flags & ~Flag.READY);
    for (let a = $.dep; a; a = a.dep_next) {
      a.dep.flags & Flag.QUEUE && run(a.dep, a.dep.flags &= ~Flag.QUEUE);
    }
  }
};
