import { Flag, Kind } from "./flags.ts";
import type { Link, Node, Target } from "./interface.ts";

const queue: (Target | null)[] = [];
let depth = 0;
/** Starts a batch. */
export const above = (): number => ++depth;
/** Ends a batch. */
export const below = (): number => --depth;
/** Runs queued effects. */
export const flush = (run: ($: Target) => void): void => {
  for (let a; a = queue.shift(); run(a));
};
const rerun = ($: Target) => {
  do if ($.flags & Flag.QUEUE) break;
  else {
    $.flags |= Flag.QUEUE;
    if ($.subs) $ = $.subs.sub as Target;
    else return queue.push($);
  } while ($);
};
const valid = ($: Node, link: Link) => {
  for (let a = $.head; a; a = a.dep_prev) if (a === link) return true;
};
/** Deeply propagates changes. */
export const deep = ($: Link, run: ($: Target) => void): void => {
  top: for (let a: (Link | null)[] = [], b = $.sub_next, c, d;;) {
    c = $.sub, d = c.flags;
    switch (d & Flag.KNOWN) {
      case Flag.RECUR:
        c.flags = d & ~Flag.RECUR; // falls through
      case Flag.CLEAR:
        c.flags |= Flag.READY, c.kind === Kind.EFFECT && rerun(c);
        break;
      default:
        if (d & Flag.SETUP || !valid(c, $)) d = Flag.CLEAR;
        else c.flags |= Flag.EARLY, d &= Flag.BEGIN;
    }
    mid: if (d & Flag.BEGIN) {
      if (!c.subs) continue top;
      $ = c.subs;
      if (!$.sub_next) continue top;
      a.push(b);
    } else if (!b) {
      while (a.length) if ($ = a.pop()!) break mid;
      break;
    } else $ = b;
    b = $.sub_next;
  }
  depth || flush(run);
};
/** Shallowly propagates changes. */
export const flat = ($: Link): void => {
  do if (($.sub.flags & Flag.SETUP) === Flag.READY) {
    $.sub.flags |= Flag.DIRTY, $.sub.kind === Kind.EFFECT && rerun($.sub);
  } while ($ = $.sub_next!);
};
