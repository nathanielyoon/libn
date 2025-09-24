import { Flag, Kind } from "./flags.ts";
import type { Effect, Link, Node, Scoper } from "./nodes.ts";
import { follow, ignore } from "./link.ts";

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
/** Updates and checks a source signal. */
export const reuse = ($: Node): boolean => {
  if ($.kind !== Kind.SIGNAL) return false;
  switch ($.flags = Flag.BEGIN, $.equals) {
    case undefined:
      return $.was !== ($.was = $.is);
    case false:
      return true;
    default:
      return !$.equals($.was, $.was = $.is);
  }
};
/** Updates and checks a derive signal. */
export const reget = ($: Node): boolean => {
  if ($.kind !== Kind.DERIVE) return false;
  const a = set_actor($);
  try {
    return follow($), $.was !== ($.was = $.is($.was));
  } finally {
    actor = a, ignore($);
  }
};
/** Checks a node's dirtiness. */
export const check = (sub: Node, $: Link): boolean => {
  for (let a: (Link | null)[] = [], b = 0, c = false, d, e;;) {
    if (d = $.dep, sub.flags & Flag.DIRTY) c = true;
    else if ((d.flags & Flag.RESET) === Flag.RESET) {
      if (reuse(d) || reget(d)) c = true, d.sub!.sub_next && flat(d.sub!);
    } else if ((d.flags & Flag.START) === Flag.START) {
      ($.sub_next || $.sub_prev) && a.push($), ++b, sub = d, $ = d.dep!;
      continue;
    }
    mid: if (c || !$.dep_next) {
      while (b--) {
        e = sub.sub!, $ = e.sub_next ? a.pop()! : e;
        if (!c) sub.flags &= ~Flag.READY;
        else if (reget(sub) || reuse(sub)) e.sub_next && flat(e), sub = $.sub;
        else if (sub = $.sub, $.dep_next) break mid;
        else c = false;
      }
      return c;
    }
    $ = $.dep_next;
  }
};
const run = ($: Node, flags: Flag) => {
  if (flags & Flag.DIRTY || flags & Flag.READY && check($, $.dep!)) {
    const a = set_actor($);
    try {
      follow($), ($ as Effect).is();
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
const queue: (Node | null)[] = []; // but it'll only have effects and scopers
let depth = 0;
const flush = () => {
  for (let a; a = queue.shift(); run(a, a.flags &= ~Flag.QUEUE));
};
/** Pauses updates, executes a function, then resumes. */
export const batch = <A>($: () => A): A => {
  try {
    return ++depth, $();
  } finally {
    --depth || flush();
  }
};
const rerun = ($: Node): number => ($.flags & Flag.QUEUE ||
  ($.flags |= Flag.QUEUE, $.sub ? rerun($.sub.sub) : queue.push($)));
/** Shallowly propagates changes. */
export const flat = ($: Link): void => {
  do if (($.sub.flags & Flag.SETUP) === Flag.READY) {
    ($.sub.flags |= Flag.DIRTY) & Flag.WATCH && rerun($.sub);
  } while ($ = $.sub_next!);
};
const valid = ($: Node, link: Link) => {
  for (let a = $.head; a; a = a.dep_prev) if (a === link) return true;
};
/** Deeply propagates changes. */
export const deep = ($: Link): void => {
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
  depth || flush();
};
