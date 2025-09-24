import { Flag, Kind } from "./flags.ts";
import type { Effect, Link, Node, Scoper } from "./nodes.ts";

/** Effects to run. */
export const queue: (Effect | Scoper | null)[] = [];
let depth = 0;
/** Starts a batch. */
export const above = (): number => ++depth;
/** Ends a batch. */
export const below = (): number => --depth;
/** Runs queued effects. */
export const flush = (run: ($: Effect | Scoper) => void): void => {
  for (let a; a = queue.shift(); run(a));
};
const rerun = ($: Effect | Scoper) => {
  do if ($.flags & Flag.QUEUE) break;
  else {
    $.flags |= Flag.QUEUE;
    if ($.sub) $ = $.sub.sub as Effect | Scoper;
    else return queue.push($);
  } while ($);
};
const valid = ($: Node, link: Link) => {
  for (let a = $.head; a; a = a.dep_prev) if (a === link) return true;
};
/** Deeply propagates changes. */
export const deep = ($: Link, run: ($: Effect | Scoper) => void): void => {
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
    if (!(d & Flag.BEGIN)) {
      if (!b) {
        while (a.length) {
          if ($ = a.pop()!) {
            b = $.sub_next;
            continue top;
          }
        }
        break;
      } else $ = b, b = b.sub_next;
    } else if (c.sub) {
      $ = c.sub;
      if ($.sub_next) a.push(b), b = $.sub_next;
    }
  }
  depth || flush(run);
};
/** Shallowly propagates changes. */
export const flat = ($: Link): void => {
  do if (($.sub.flags & Flag.SETUP) === Flag.READY) {
    $.sub.flags |= Flag.DIRTY, $.sub.kind === Kind.EFFECT && rerun($.sub);
  } while ($ = $.sub_next!);
};
