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
  & { [_ in "head" | "deps" | "subs" | "tail"]: Link | null };
type Source<A = any> = Noder<Kind.SOURCE> & { old: A; has: A };
type Derive<A = any> = Noder<Kind.DERIVE> & { has?: A; get: (old?: A) => A };
type Effect = Noder<Kind.EFFECT> & { run: () => void };
type Node = Source | Derive | Effect;
type Link = {
  on: number;
  dep_prev: Link | null;
  dep: Node;
  dep_next: Link | null;
  sub_prev: Link | null;
  sub: Node;
  sub_next: Link | null;
};
const queue: Effect[] = [];
let on = 0, at = 0, sub: Node | undefined;
/** Manually sets the current subscriber (exported for testing). */
export const set = ($?: Node): Node | undefined => ([sub, $] = [$, sub])[1];
const enlink = ($: Node) => {
  if (!sub) return;
  const a = sub.head;
  if (a?.dep === $) return;
  const b = a ? a.dep_next : sub.deps;
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
  a ? a.dep_next = d : sub.deps = d, c ? c.sub_next = d : $.subs = d;
};
const delink = ($: Node, link: Link) => {
  const a = link.dep_prev, b = link.dep, c = link.dep_next, d = link.sub_prev;
  c ? c.dep_prev = a : $.head = a, a ? a.dep_next = c : $.deps = c;
  let e = link.sub_next;
  if (e ? e.sub_prev = d : b.tail = d) d!.sub_next = e;
  else if (!(b.subs = e) && b.deps) {
    for (b.flags = Flag.CLEAR, e = b.deps; e = delink(b, e););
  }
  return c;
};
const track = ($: Node) => {
  ++on, $.head = null, $.flags = $.flags & ~56 | Flag.CHECK; // 56 = RECUR | DIRTY | READY
};
const close = ($: Node) => {
  for (let a = $.head ? $.head.dep_next : $.deps; a; a = delink($, a));
  $.flags &= ~Flag.CHECK;
};
const reset = ($: Node) =>
  $.kind === Kind.SOURCE && ($.flags = Flag.MAYBE, $.old !== ($.old = $.has));
const reget = ($: Node) => {
  if ($.kind !== Kind.DERIVE) return false;
  const a = set($);
  try {
    return track($), $.has !== ($.has = $.get($.has));
  } finally {
    set(a), close($);
  }
};
const rerun = ($: Node): Node | number => ($.flags & Flag.QUEUE ||
  ($.flags |= Flag.QUEUE, $.subs ? rerun($.subs.sub) : queue.push($ as any)));
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
      c.subs && ($ = c.subs).sub_next && (a.push(b), b = $.sub_next);
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
const flat = ($: Link) => {
  do ($.sub.flags & 48) === Flag.READY && // 48 = READY | DIRTY
    ($.sub.flags |= Flag.DIRTY) & Flag.WATCH &&
    rerun($.sub); while ($ = $.sub_next!);
};
const check = ($: Node, link: Link) => {
  top: for (let a: Link[] = [], b = 0, c, d;;) {
    if (c = false, d = link.dep, $.flags & Flag.DIRTY) c = true;
    else if ((d.flags & Flag.CLEAR) === Flag.CLEAR) {
      if (reset(d) || reget(d)) c = true, d.subs!.sub_next && flat(d.subs!);
    } else if ((d.flags & 33) === 33) { // 33 = MAYBE | READY
      if (link.sub_next || link.sub_prev) a.push(link);
      ++b, $ = d, link = d.deps!;
      continue;
    }
    if (c || !link.dep_next) {
      while (b--) {
        link = (d = $.subs!).sub_next ? a.pop()! : d;
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
  if (flags & Flag.DIRTY || flags & Flag.READY && check($, $.deps!)) {
    const a = set($);
    try {
      track($), ($ as Effect).run();
    } finally {
      set(a), close($);
    }
    return;
  } else if (flags & Flag.READY) $.flags = flags & ~Flag.READY;
  for (let a = $.deps; a; a = a.dep_next) {
    a.dep.flags & Flag.QUEUE && run(a.dep, a.dep.flags &= ~Flag.QUEUE);
  }
};
function source(this: Source, ...$: [unknown]) {
  if (!$.length) {
    this.flags & Flag.DIRTY && reset(this) && this.subs && flat(this.subs);
    enlink(this);
  } else if (
    this.has !==
      (this.has = typeof $[0] === "function" ? $[0](this.has) : $[0]) &&
    (this.flags = Flag.CLEAR, this.subs)
  ) {
    deep(this.subs);
    while (at < queue.length) run(queue[at], queue[at++].flags &= ~Flag.QUEUE);
    queue.length = at = 0;
  }
  return this.has;
}
function derive(this: Derive) {
  if (
    this.flags & Flag.DIRTY ||
    this.flags & Flag.READY && check(this, this.deps!)
  ) reget(this) && this.subs && flat(this.subs);
  else if (this.flags & Flag.READY) this.flags &= ~Flag.READY;
  return enlink(this), this.has;
}
function dispose(this: Effect) {
  for (let a = this.deps; a; a = delink(this, a));
  this.subs && delink(this.subs.sub, this.subs), this.flags &= 0;
}
/** Creates a reactive value. */
export const signal = (
  (initial: any, maybe_initial?: any) =>
    typeof initial !== "function"
      ? source.bind({
        kind: Kind.SOURCE,
        flags: Flag.MAYBE,
        head: null,
        deps: null,
        subs: null,
        tail: null,
        old: initial,
        has: initial,
      })
      : derive.bind({
        kind: Kind.DERIVE,
        flags: Flag.CLEAR,
        head: null,
        deps: null,
        subs: null,
        tail: null,
        get: initial, // <https://github.com/microsoft/TypeScript/issues/47599>
        has: maybe_initial,
      })
) as {
  <A>(deriver: (old?: A) => A): () => A;
  <A>(deriver: (old: A) => A, initial: A): () => A;
  <A>(): { (): A | undefined; <const B extends A>($: B | (($: B) => B)): B };
  <A>(initial: A): { (): A; <const B extends A>($: B | (($: B) => B)): B };
};
/** Creates a side effect and returns a disposer. */
export const effect = (run: () => void): () => void => {
  const a: Effect = {
    kind: Kind.EFFECT,
    flags: Flag.WATCH,
    head: null,
    deps: null,
    subs: null,
    tail: null,
    run,
  };
  enlink(a);
  const b = set(a);
  try {
    run();
  } finally {
    set(b);
  }
  return dispose.bind(a);
};
