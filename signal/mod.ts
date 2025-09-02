const enum Flag {
  MAYBE = 1 << 0,
  WATCH = 1 << 1,
  CHECK = 1 << 2,
  RECUR = 1 << 3,
  DIRTY = 1 << 4,
  READY = 1 << 5,
  QUEUE = 1 << 6,
  CLEAR = Flag.MAYBE | Flag.DIRTY,
}
const enum Kind {
  SOURCE,
  DERIVE,
  EFFECT,
}
type Noder<A extends Kind> =
  & { kind: A; flags: Flag }
  & { [_ in "head" | "dep" | "sub" | "tail"]: Link | null };
type Source<A = any> = Noder<Kind.SOURCE> & { old: A; is: A };
type Derive<A = any> = Noder<Kind.DERIVE> & { old?: A; is: (old?: A) => A };
type Effect = Noder<Kind.EFFECT> & { is: () => void };
type Node = Source | Derive | Effect;
type Link =
  & { on: number; dep: Node; sub: Node }
  & { [_ in `${"dep" | "sub"}_${"prev" | "next"}`]: Link | null };
const queue: Node[] = [];
let on = 0, at = 0, sub: Node | undefined;
/** Manually sets the current subscriber (exported for testing). */
export const set = ($?: Node): Node | undefined => ([sub, $] = [$, sub])[1];
const enlink = ($: Node) => {
  if (!sub) return;
  const a = sub.head;
  if (a?.dep === $) return;
  const b = a ? a.dep_next : sub.dep;
  if (b?.dep === $) return b.on = on, sub.head = b;
  const c = $.tail;
  if (c?.on === on && c.sub === sub) return;
  const d = sub.head = $.tail = {
    on,
    dep_prev: a,
    dep: $,
    dep_next: b,
    sub_prev: c,
    sub: sub,
    sub_next: null,
  };
  if (b) b.dep_prev = d;
  a ? a.dep_next = d : sub.dep = d, c ? c.sub_next = d : $.sub = d;
};
const delink = ($: Node, link: Link) => {
  const a = link.dep_prev, b = link.dep, c = link.dep_next, d = link.sub_prev;
  c ? c.dep_prev = a : $.head = a, a ? a.dep_next = c : $.dep = c;
  let e = link.sub_next;
  if (e ? e.sub_prev = d : b.tail = d) d!.sub_next = e;
  else if (!(b.sub = e) && b.dep) {
    for (b.flags = Flag.CLEAR, e = b.dep; e = delink(b, e););
  }
  return c;
};
const track = ($: Node) => {
  ++on, $.head = null, $.flags = $.flags & ~56 | Flag.CHECK; // 56 = RECUR | DIRTY | READY
};
const close = ($: Node) => {
  for (let a = $.head ? $.head.dep_next : $.dep; a; a = delink($, a));
  $.flags &= ~Flag.CHECK;
};
const reset = ($: Node) =>
  $.kind === Kind.SOURCE && ($.flags = Flag.MAYBE, $.old !== ($.old = $.is));
const reget = ($: Node) => {
  if ($.kind !== Kind.DERIVE) return false;
  const a = set($);
  try {
    return track($), $.old !== ($.old = $.is($.old));
  } finally {
    set(a), close($);
  }
};
const rerun = ($: Node): number => ($.flags & Flag.QUEUE ||
  ($.flags |= Flag.QUEUE, $.sub ? rerun($.sub.sub) : queue.push($)));
const ok = (link: Link, sub: Node) => {
  for (let a = sub.head; a; a = a.dep_prev) if (a === link) return true;
};
const deep = ($: Link) => {
  top: for (let a: (Link | null)[] = [], b = $.sub_next, c, d;;) {
    if (c = $.sub, d = c.flags, !(d & 60)) c.flags |= Flag.READY; // 60 = CHECK | RECUR | DIRTY | READY
    else if (!(d & 12)) d = 0; // 12 = CHECK | RECUR
    else if (!(d & Flag.CHECK)) c.flags = d & ~Flag.RECUR | Flag.READY;
    else if (d & 48 || !ok($, c)) d = 0; // 48 = DIRTY | READY
    else c.flags |= 40, d &= Flag.MAYBE; // 40 = RECUR | READY
    if (d & Flag.WATCH && rerun(c), d & Flag.MAYBE) {
      c.sub && ($ = c.sub).sub_next && (a.push(b), b = $.sub_next);
    } else if (!b) {
      while (a.length) {
        if ($ = a.pop()!) {
          b = $.sub_next;
          continue top;
        }
      }
      break;
    } else $ = b, b = $.sub_next;
  }
};
const flat = ($: Link | null) => {
  while ($) { // 48 = READY | DIRTY
    ($.sub.flags & 48) === Flag.READY &&
    ($.sub.flags |= Flag.DIRTY) & Flag.WATCH &&
    rerun($.sub), $ = $?.sub_next!;
  }
};
const check = ($: Node, link: Link) => {
  top: for (let a: Link[] = [], b = 0, c, d;;) {
    if (c = false, d = link.dep, $.flags & Flag.DIRTY) c = true;
    else if ((d.flags & Flag.CLEAR) === Flag.CLEAR) {
      if (reset(d) || reget(d)) c = true, d.sub!.sub_next && flat(d.sub!);
    } else if ((d.flags & 33) === 33) { // 33 = MAYBE | READY
      if (link.sub_prev || link.sub_next) a.push(link);
      ++b, $ = d, link = d.dep!;
      continue;
    }
    if (c || !link.dep_next) {
      while (b--) {
        link = (d = $.sub!).sub_next ? a.pop()! : d;
        if (!c) $.flags &= ~Flag.READY;
        else if (reset($) || reget($)) d.sub_next && flat(d), $ = link.sub;
        else if ($ = link.sub, link.dep_next) {
          link = link.dep_next;
          continue top;
        } else c = false;
      }
      return c;
    } else link = link.dep_next;
  }
};
const run = ($: Node, flags: Flag) => {
  if (flags & Flag.DIRTY || flags & Flag.READY && check($, $.dep!)) {
    const a = set($);
    try {
      track($), ($ as Effect).is();
    } finally {
      set(a), close($);
    }
    return;
  } else if (flags & Flag.READY) $.flags = flags & ~Flag.READY;
  for (let a = $.dep; a; a = a.dep_next) {
    a.dep.flags & Flag.QUEUE && run(a.dep, a.dep.flags &= ~Flag.QUEUE);
  }
};
function source(this: Source, ...$: [unknown]) {
  if (!$.length) {
    this.flags & Flag.DIRTY && reset(this) && flat(this.sub), enlink(this);
  } else if (
    this.is !== (this.is = typeof $[0] === "function" ? $[0](this.is) : $[0]) &&
    (this.flags = Flag.CLEAR, this.sub)
  ) {
    deep(this.sub);
    while (at < queue.length) run(queue[at], queue[at++].flags &= ~Flag.QUEUE);
    queue.length = at = 0;
  }
  return this.is;
}
function derive(this: Derive) {
  this.flags & Flag.DIRTY || this.flags & Flag.READY && check(this, this.dep!)
    ? reget(this) && flat(this.sub)
    : (this.flags &= ~Flag.READY);
  return enlink(this), this.old;
}
function dispose(this: Effect) {
  for (let a = this.dep; a; a = delink(this, a));
  this.sub && delink(this.sub.sub, this.sub), this.flags &= 0;
}
const node = <A extends Kind, B>(kind: A, flags: Flag, rest: B) => (
  { kind, flags, head: null, dep: null, sub: null, tail: null, ...rest }
);
/** Reactive value. */
export type Signal<A> = { (): A; <const C extends A>($: C | (($: C) => C)): C };
/** Creates a reactive value. */
export const signal = (
  ($: any, initial?: any) =>
    typeof $ !== "function"
      ? source.bind(node(Kind.SOURCE, Flag.MAYBE, { old: $, is: $ }))
      : derive.bind(node(Kind.DERIVE, Flag.CLEAR, { old: initial, is: $ }))
) as {
  <A>(deriver: (old?: A) => A): () => A; // <https://github.com/microsoft/TypeScript/issues/47599>
  <A>(deriver: (old: A) => A, initial: A): () => A;
  <A>(initial: A): Signal<A>;
};
/** Creates a side effect and returns a disposer. */
export const effect = (is: () => void): () => void => {
  const a = node(Kind.EFFECT, Flag.WATCH, { is });
  enlink(a);
  const b = set(a);
  try {
    is();
  } finally {
    set(b);
  }
  return dispose.bind(a);
};
