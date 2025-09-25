import { Flag } from "./flags.ts";
import type { Effect, Link, Node, Scoper } from "./interface.ts";
import { follow, ignore } from "./link.ts";
import { flat } from "./queue.ts";
import { retry, set_actor } from "./state.ts";

/** Determines whether a node is dirty. */
export const check = (sub: Node, $: Link): boolean => {
  const stack: (Link | null)[] = [];
  let b = 0, c = false, d, e;
  do {
    d = $.dep;
    if (sub.flags & Flag.DIRTY) c = true;
    else if ((d.flags & Flag.RESET) === Flag.RESET) {
      if (retry(d)) c = true, d.subs!.sub_next && flat(d.subs!);
    } else if ((d.flags & Flag.CAUSE) === Flag.CAUSE) {
      ($.sub_next || $.sub_prev) && stack.push($), ++b, sub = d, $ = d.deps!;
      continue;
    }
    mid: if (c || !$.dep_next) {
      while (b--) {
        e = sub.subs!, $ = e.sub_next ? stack.pop()! : e;
        if (!c) sub.flags &= ~Flag.READY;
        else if (retry(sub)) e.sub_next && flat(e), sub = $.sub;
        else if (sub = $.sub, $.dep_next) break mid;
        else c = false;
      }
      return c;
    }
    $ = $.dep_next;
  } while (true);
};
/** Runs effects. */
export const run = ($: Effect | Scoper): void => {
  $.flags &= ~Flag.QUEUE;
  switch ($.flags & Flag.SETUP) {
    case Flag.SETUP:
    case Flag.DIRTY:
      break;
    case Flag.READY:
      if (check($, $.deps!)) break;
      $.flags &= ~Flag.READY; // falls through
    default:
      for (let a = $.deps; a; a = a.dep_next) { // recur into inner effects
        a.dep.flags & Flag.QUEUE && run(a.dep as Effect | Scoper);
      }
      return;
  }
  const a = set_actor($);
  try {
    return follow($), $.run(); // calls inner effects too
  } finally {
    set_actor(a), ignore($);
  }
};
