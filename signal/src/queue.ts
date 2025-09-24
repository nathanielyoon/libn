import { Flag } from "./flags.ts";
import type { Effect, Link, Node, Scoper } from "./nodes.ts";

/** Effects to run. */
export const queue: (Effect | Scoper | null)[] = [];
let depth = 0;
/** Starts a batch. */
export const above = (): number => ++depth;
/** Ends a batch. */
export const below = (): number => --depth;
/** Runs queued effects. */
export const flush = (run: ($: Node) => void): void => {
  for (let a; a = queue.shift(); a.flags &= ~Flag.QUEUE, run(a));
};
const rerun = ($: Effect | Scoper) => {
  do if ($.flags & Flag.QUEUE) break;
  else if ($.flags |= Flag.QUEUE, $.sub) $ = $.sub.sub as Effect | Scoper;
  else return queue.push($); while ($);
};
const valid = ($: Node, link: Link) => {
  for (let a = $.head; a; a = a.dep_prev) if (a === link) return true;
};
/** Deeply propagates changes. */
export const deep = ($: Link, run: ($: Node) => void): void => {
  top: for (let a: (Link | null)[] = [], b = $.sub_next, c, d;;) {
    if (c = $.sub, d = c.flags, !(d & Flag.KNOWN)) c.flags |= Flag.READY;
    else if (!(d & Flag.GOING)) d = Flag.CLEAR;
    else if (!(d & Flag.CHECK)) c.flags = d & ~Flag.RECUR | Flag.READY;
    else if (d & Flag.SETUP || !valid(c, $)) d = Flag.CLEAR;
    else c.flags |= Flag.EARLY, d &= Flag.BEGIN;
    if (d & Flag.WATCH && rerun(c as Effect | Scoper), d & Flag.BEGIN) {
      if (c.sub && ($ = c.sub).sub_next) a.push(b), b = $.sub_next;
    } else if (!b) {
      while (a.length) {
        if ($ = a.pop()!) {
          b = $.sub_next;
          continue top;
        }
      }
      break;
    } else b = ($ = b).sub_next;
  }
  depth || flush(run);
};
/** Shallowly propagates changes. */
export const flat = ($: Link): void => {
  do if (($.sub.flags & Flag.SETUP) === Flag.READY) {
    ($.sub.flags |= Flag.DIRTY) & Flag.WATCH && rerun($.sub as Effect | Scoper);
  } while ($ = $.sub_next!);
};
