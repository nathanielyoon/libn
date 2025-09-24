import { Flag } from "./flags.ts";
import type { Link, Node } from "./nodes.ts";

/** Effects to run. */
export const queue: (Node | null)[] = [];
let depth = 0;
/** Starts a batch. */
export const above = () => ++depth;
/** Ends a batch. */
export const below = () => --depth;
/** Runs queued effects. */
export const flush = (run: ($: Node, flags: Flag) => void) => {
  for (let a; a = queue.shift(); run(a, a.flags &= ~Flag.QUEUE));
};
const rerun = ($: Node): number => ($.flags & Flag.QUEUE ||
  ($.flags |= Flag.QUEUE, $.sub ? rerun($.sub.sub) : queue.push($)));
const valid = ($: Node, link: Link) => {
  for (let a = $.head; a; a = a.dep_prev) if (a === link) return true;
};
/** Deeply propagates changes. */
export const deep = ($: Link, run: ($: Node, flags: Flag) => void): void => {
  top: for (let a: (Link | null)[] = [], b = $.sub_next, c, d;;) {
    if (c = $.sub, d = c.flags, !(d & Flag.KNOWN)) c.flags |= Flag.READY;
    else if (!(d & Flag.GOING)) d = Flag.CLEAR;
    else if (!(d & Flag.CHECK)) c.flags = d & ~Flag.RECUR | Flag.READY;
    else if (d & Flag.SETUP || !valid(c, $)) d = Flag.CLEAR;
    else c.flags |= Flag.EARLY, d &= Flag.BEGIN;
    if (d & Flag.WATCH && rerun(c), d & Flag.BEGIN) {
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
    ($.sub.flags |= Flag.DIRTY) & Flag.WATCH && rerun($.sub);
  } while ($ = $.sub_next!);
};
