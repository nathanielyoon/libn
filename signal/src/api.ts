import type { Derive, Effect, Link, Node, Scoper, Source } from "./system.ts";
import { dispose, Flag, follow, ignore, Kind, link } from "./system.ts";

const queue: (Node | null)[] = []; // but it'll only have effects and scopers
let depth = 0, actor: Node | null = null, scope: Scoper | null = null, swapper;
/** Manually sets the current subscriber. */
export const set_actor = ($: Node | null): Node | null => (
  swapper = actor, actor = $, swapper
);
const flush = () => {
  for (let a; a = queue.shift(); run(a, a.flags &= ~Flag.QUEUE));
};
const reuse = ($: Node) =>
  $.kind === Kind.SOURCE && ($.flags = Flag.BEGIN, $.was !== ($.was = $.is));
const reget = ($: Node) => {
  if ($.kind !== Kind.DERIVE) return false;
  const a = set_actor($);
  try {
    return follow($), $.was !== ($.was = $.is($.was));
  } finally {
    actor = a, ignore($);
  }
};
const rerun = ($: Node): number => ($.flags & Flag.QUEUE ||
  ($.flags |= Flag.QUEUE, $.sub ? rerun($.sub.sub) : queue.push($)));
const flat = ($: Link) => {
  do if (($.sub.flags & Flag.SETUP) === Flag.READY) {
    ($.sub.flags |= Flag.DIRTY) & Flag.WATCH && rerun($.sub);
  } while ($ = $.sub_next!);
};
const check = (sub: Node, $: Link) => {
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
        else if (reuse(sub) || reget(sub)) e.sub_next && flat(e), sub = $.sub;
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
      actor = a, ignore($);
    }
  } else {
    flags & Flag.READY && ($.flags = flags & ~Flag.READY);
    for (let a = $.dep; a; a = a.dep_next) {
      a.dep.flags & Flag.QUEUE && run(a.dep, a.dep.flags &= ~Flag.QUEUE);
    }
  }
};
const valid = ($: Node, link: Link) => {
  for (let a = $.head; a; a = a.dep_prev) if (a === link) return true;
};
function sourcer(this: Source, ...$: [unknown]) {
  if (!$.length) {
    if (this.flags & Flag.DIRTY && reuse(this) && this.sub) flat(this.sub);
    link(this, actor);
  } else if (
    this.is !== (this.is = typeof $[0] === "function" ? $[0](this.is) : $[0]) &&
    (this.flags = Flag.RESET, this.sub)
  ) {
    const a: (Link | null)[] = [];
    let b = this.sub, c = b.sub_next, d, e;
    top: do {
      d = b.sub, e = d.flags;
      if (!(e & Flag.KNOWN)) (d.flags |= Flag.READY) & Flag.WATCH && rerun(d);
      else if (!(e & Flag.GOING)) e = Flag.CLEAR;
      else if (!(e & Flag.CHECK)) {
        (d.flags = e & ~Flag.RECUR | Flag.READY) & Flag.WATCH && rerun(d);
      } else if (e & Flag.SETUP || !valid(d, b)) e = Flag.CLEAR;
      else d.flags |= Flag.EARLY, (e &= Flag.BEGIN) & Flag.WATCH && rerun(d);
      if (e & Flag.BEGIN) {
        if (d.sub && (b = d.sub).sub_next) a.push(c), c = b.sub_next;
      } else if (!c) {
        while (a.length) {
          if (b = a.pop()!) {
            c = b.sub_next;
            continue top;
          }
        }
        break;
      } else b = c, c = c.sub_next;
    } while (true);
    depth || flush();
  }
  return this.is;
}
function deriver(this: Derive) {
  this.flags & Flag.DIRTY || this.flags & Flag.READY && check(this, this.dep!)
    ? reget(this) && this.sub && flat(this.sub)
    : (this.flags &= ~Flag.READY);
  return link(this, actor ?? scope), this.was;
}
const node = <A extends Kind, B>(kind: A, flags: Flag, rest: B) => (
  { kind, flags, head: null, dep: null, sub: null, tail: null, ...rest }
);
/** Combined getter/setter for a reactive value. */
export type Signal<A> = { (): A; <const B extends A>($: B | (($: B) => B)): B };
/** Creates a reactive value. */
export const signal =
  (($: any, and?: any) =>
    typeof $ === "function"
      ? deriver.bind(node(Kind.DERIVE, Flag.RESET, { was: and, is: $ }))
      : sourcer.bind(node(Kind.SOURCE, Flag.BEGIN, { was: $, is: $ }))) as {
      // Omitting the initial value limits type inference for the deriver's
      // parameter (see <https://github.com/microsoft/TypeScript/issues/47599>).
      <A>(deriver: (was?: A) => A): () => A;
      <A>(deriver: (was: A) => A, initial: A): () => A;
      (): Signal<never>;
      <A>(): Signal<A | undefined>;
      <A>(initial: A): Signal<A>;
    };
/** Creates a side effect and returns a disposer. */
export const effect = (is: () => void): () => void => {
  const a = node(Kind.EFFECT, Flag.WATCH, { is });
  link(a, actor ?? scope);
  const b = set_actor(a);
  try {
    a.is();
  } finally {
    actor = b;
  }
  return dispose.bind(a);
};
/** Creates a group of effects and returns a disposer. */
export const scoper = (all: () => void): () => void => {
  const a = node(Kind.SCOPER, Flag.CLEAR, {});
  link(a, scope);
  const b = set_actor(null), c = scope;
  try {
    scope = a, all();
  } finally {
    actor = b, scope = c;
  }
  return dispose.bind(a);
};
/** Pauses updates, executes a function, then resumes. */
export const batch = <A>($: () => A): A => {
  try {
    return ++depth, $();
  } finally {
    --depth || flush();
  }
};
