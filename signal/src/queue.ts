import {
  type Effect,
  Flag,
  Kind,
  type Link,
  type Node,
  type Scoper,
} from "./node.ts";

let depth = 0;
/** Starts a batch. */
export const above = (): number => ++depth;
/** Ends a batch. */
export const below = (): number => --depth;
const queue: (Effect | Scoper | null)[] = [];
/** Runs queued effects. */
export const flush = (run: ($: Effect | Scoper) => void): void => {
  for (let head; head = queue.shift(); run(head));
};
const rerun = ($: Effect | Scoper) => {
  do if ($.flags & Flag.QUEUE) return;
  else if ($.flags |= Flag.QUEUE, $.subs) $ = $.subs.sub as Effect | Scoper;
  else return queue.push($); while ($);
};
const valid = ($: Node, link: Link) => {
  for (let dep = $.head; dep; dep = dep.dep_prev) if (dep === link) return true;
};
/** Deeply propagates changes. */
export const deep = ($: Link, run: ($: Effect | Scoper) => void): void => {
  const stack: (Link | null)[] = [];
  let next = $.sub_next;
  top: do {
    const sub = $.sub;
    let flags = sub.flags;
    switch (flags & Flag.KNOWN) {
      case Flag.RECUR:
        sub.flags &= ~Flag.RECUR; // falls through
      case Flag.CLEAR:
        sub.flags |= Flag.READY, sub.kind === Kind.EFFECT && rerun(sub);
        break;
      default:
        if (flags & Flag.SETUP || !valid(sub, $)) flags = Flag.CLEAR;
        else sub.flags |= Flag.RECUR | Flag.READY, flags &= Flag.BEGIN;
    }
    mid: if (flags & Flag.BEGIN) {
      if (!sub.subs || !($ = sub.subs).sub_next) continue top;
      stack.push(next);
    } else if (!next) {
      while (stack.length) if ($ = stack.pop()!) break mid;
      break;
    } else $ = next;
    next = $.sub_next;
  } while (true);
  depth || flush(run);
};
/** Shallowly propagates changes. */
export const flat = ($: Link): void => {
  do if (($.sub.flags & Flag.SETUP) === Flag.READY) {
    $.sub.flags |= Flag.DIRTY, $.sub.kind === Kind.EFFECT && rerun($.sub);
  } while ($ = $.sub_next!);
};
