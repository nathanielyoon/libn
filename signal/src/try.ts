import { Flag, Kind } from "./flags.ts";
import type { Link, Node, Target } from "./interface.ts";
import { dispose, follow, ignore, link } from "./link.ts";
import { flat } from "./queue.ts";
import { get_scope, retry, set_actor, set_scope } from "./state.ts";

/** Determines whether a node is dirty. */
export const check = (sub: Node, $: Link): boolean => {
  for (let a: (Link | null)[] = [], b = 0, c = false, d, e;;) {
    if (d = $.dep, sub.flags & Flag.DIRTY) c = true;
    else if ((d.flags & Flag.RESET) === Flag.RESET) {
      if (retry(d)) c = true, d.subs!.sub_next && flat(d.subs!);
    } else if ((d.flags & Flag.CAUSE) === Flag.CAUSE) {
      ($.sub_next || $.sub_prev) && a.push($), ++b, sub = d, $ = d.deps!;
      continue;
    }
    mid: if (c || !$.dep_next) {
      while (b--) {
        e = sub.subs!, $ = e.sub_next ? a.pop()! : e;
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
/** Runs effects. */
export const run = ($: Target): void => {
  $.flags &= ~Flag.QUEUE;
  if ($.flags & Flag.DIRTY || $.flags & Flag.READY && check($, $.deps!)) {
    const a = set_actor($);
    try {
      return follow($), $.run(); // calls inner effects too
    } finally {
      set_actor(a), ignore($);
    }
  }
  if ($.flags & Flag.READY) $.flags &= ~Flag.READY;
  for (let a = $.deps; a; a = a.dep_next) { // outer isn't dirty but inner may be
    a.dep.flags & Flag.QUEUE && run(a.dep as Target);
  }
};
/** Links and runs effects. */
export const add = ($: Target): () => void => {
  let a, b;
  if ($.kind === Kind.SCOPER) {
    a = set_actor(null), link($, b = set_scope($ as Target<Kind.SCOPER>));
  } else a = set_actor($), link($, get_scope() ?? a);
  try {
    $.run();
  } finally {
    set_actor(a), b !== undefined && set_scope(b);
  }
  return dispose.bind(null, $);
};
