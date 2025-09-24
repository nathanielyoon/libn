/** State flags, some composite. */
export const enum Flag {
  CLEAR = 0,
  BEGIN = 1 << 0, // is mutable from outside (i.e. can begin a chain of updates)
  WATCH = 1 << 1, // only set for effects
  CHECK = 1 << 2, // for recursed
  RECUR = 1 << 3,
  GOING = Flag.CHECK | Flag.RECUR, // recursing
  DIRTY = 1 << 4,
  RESET = Flag.BEGIN | Flag.DIRTY, // was mutated
  READY = 1 << 5, // update pending
  START = Flag.BEGIN | Flag.READY, // origin of change
  EARLY = Flag.RECUR | Flag.READY, // just getting going
  SETUP = Flag.DIRTY | Flag.READY, // "checked and cleared"
  KNOWN = Flag.GOING | Flag.SETUP, // seen before
  QUEUE = 1 << 6,
  FRESH = ~(Flag.RECUR | Flag.SETUP), // when starting to follow
}
/** Reactive node types. */
export const enum Kind {
  SOURCE,
  DERIVE,
  EFFECT,
  SCOPER,
}
/** @internal */
type Noder<A extends Kind> =
  & { kind: A; flags: Flag }
  & { [_ in "head" | "dep" | "sub" | "tail"]: Link | null };
/** Equality check. */
export type Equals<A> = (prev: A, next: A) => boolean;
/** Mutable data source. */
export type Source<A = any> = Noder<Kind.SOURCE> & {
  was: A;
  is: A;
  equals?: Equals<A>;
};
/** Derived computation. */
export type Derive<A = any> = Noder<Kind.DERIVE> & { was: A; is: ($?: A) => A };
/** Effectful reaction. */
export type Effect = Noder<Kind.EFFECT> & { is: () => void };
/** Effect scope owner. */
export type Scoper = Noder<Kind.SCOPER>;
/** Reactive node. */
export type Node = Source | Derive | Effect | Scoper;
/** Connection between two reactive nodes. */
export type Link =
  & { step: number; dep: Node; sub: Node }
  & { [_ in `${"dep" | "sub"}_${"prev" | "next"}`]: Link | null };
let step = 0; // can only increase
/** Connects two nodes. */
export const link = (dep: Node, sub: Node | null): void => {
  if (!sub) return;
  const a = sub.head;
  if (a?.dep === dep) return;
  const b = a ? a.dep_next : sub.dep;
  if (b?.dep === dep) return sub.head = b, b.step = step as any;
  const c = dep.tail;
  if (c?.step === step && c.sub === sub) return;
  const d = sub.head = dep.tail = {
    step,
    dep_prev: a,
    dep,
    dep_next: b,
    sub_prev: c,
    sub,
    sub_next: null,
  };
  if (b) b.dep_prev = d;
  a ? a.dep_next = d : sub.dep = d, c ? c.sub_next = d : dep.sub = d;
};
const chop = (sub: Node, $: Link) => {
  const a = $.dep_prev, b = $.dep, c = $.dep_next, d = $.sub_prev;
  (c ? c.dep_prev = a : sub.head = a) ? a!.dep_next = c : sub.dep = c;
  let e = $.sub_next;
  if (e ? e.sub_prev = d : b.tail = d) d!.sub_next = e;
  else if (!(b.sub = e)) {
    if (b.kind === Kind.DERIVE) {
      for (b.flags = Flag.RESET, e = b.dep; e; e = chop(b, e));
    } else b.kind === Kind.SOURCE || dispose.call(b);
  }
  return c;
};
/** Cleans up effects. */
export function dispose(this: Effect | Scoper): void {
  for (let a = this.dep; a; a = chop(this, a));
  this.sub && chop(this.sub.sub, this.sub), this.flags = Flag.CLEAR;
}
/** Starts tracking a node. */
export const follow = ($: Node): void => {
  ++step, $.head = null, $.flags = $.flags & Flag.FRESH | Flag.CHECK;
};
/** Stops tracking a node. */
export const ignore = ($: Node): void => {
  for (let a = $.head ? $.head.dep_next : $.dep; a; a = chop($, a));
  $.flags &= ~Flag.CHECK;
};
