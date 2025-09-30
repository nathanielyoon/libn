import { Flag, Kind } from "./flags.ts";
import type { Derive, Effect, Is, Link, Node, Scoper, Signal } from "./node.ts";
import { dispose, drop, enlink, validate } from "./link.ts";

const queue: (Effect | Scoper)[] = [];
let depth = 0, step = 0, on: Node | null = null;
/** Pauses updates, runs a function, then resumes. */
export const batch = <A>($: () => A): A => {
  ++depth;
  try {
    return $();
  } finally {
    --depth || pull();
  }
};
/** Manually sets the current subscriber. */
export const activate = ($: Node | null): Node | null => ([$, on] = [on, $])[0];
const reset = ($: Signal) => (
  $.flags = Flag.BEGIN, !$.is($.prev, $.prev = $.next)
);
const reget = ($: Derive) => {
  const prev = on;
  on = $, ++step, $.head = null, $.flags = Flag.INNER;
  try {
    return !$.is($.prev, $.prev = $.next($.prev));
  } finally {
    on = prev, drop($);
  }
};
const retry = ($: Node) =>
  $.kind === Kind.SIGNAL && reset($) || $.kind === Kind.DERIVE && reget($);
const check = (sub: Node, $: Link) => {
  const stack: (Link | null)[] = [];
  let size = 0, dirty = false, dep, link;
  do {
    if (sub.flags & Flag.DIRTY) dirty = true;
    else if (dep = $.dep, (dep.flags & Flag.START) === Flag.START) {
      if (retry(dep)) dep.subs!.sub_next && flat(dep.subs!), dirty = true;
    } else if ((dep.flags & Flag.CAUSE) === Flag.CAUSE) {
      if ($.sub_next || $.sub_prev) stack.push($);
      ++size, sub = dep, $ = dep.deps!;
      continue;
    }
    mid: if (dirty || !$.dep_next) {
      while (size--) {
        link = sub.subs!, $ = link.sub_next ? stack.pop()! : link;
        if (!dirty) sub.flags &= ~Flag.READY;
        else if (retry(sub)) link.sub_next && flat(link), sub = $.sub;
        else if (sub = $.sub, $.dep_next) break mid;
        else dirty = false;
      }
      return dirty;
    }
    $ = $.dep_next;
  } while (true);
};
const run = ($: Effect | Scoper) => {
  switch (($.flags &= ~Flag.QUEUE) & Flag.SETUP) {
    case Flag.READY:
      if (check($, $.deps!)) break;
      $.flags &= ~Flag.READY; // falls through
    case Flag.CLEAR:
      for (let next = $.deps; next; next = next.dep_next) {
        next.dep.flags & Flag.QUEUE && run(next.dep as Effect | Scoper);
      }
      return;
  }
  const prev = on;
  on = $, ++step, $.head = null, $.flags = Flag.OUTER;
  try {
    $.run();
  } finally {
    on = prev, drop($);
  }
};
const pull = () => {
  for (let first; first = queue.shift(); run(first));
};
const push = ($: Effect | Scoper) => {
  do if ($.flags & Flag.QUEUE) return;
  else if ($.flags |= Flag.QUEUE, $.subs) $ = $.subs.sub as Effect | Scoper;
  else return queue.push($); while ($);
};
const flat = ($: Link) => {
  do ($.sub.flags & Flag.SETUP) === Flag.READY &&
    ($.sub.flags |= Flag.DIRTY) & Flag.WATCH &&
    push($.sub as Effect | Scoper); while ($ = $.sub_next!);
};
const deep = ($: Link) => {
  const stack: (Link | null)[] = [];
  let next = $.sub_next, sub, flags;
  top: do {
    switch (sub = $.sub, (flags = sub.flags) & Flag.KNOWN) {
      case Flag.RECUR:
        sub.flags &= ~Flag.RECUR; // falls through
      case Flag.CLEAR:
        sub.flags |= Flag.READY;
        flags & Flag.WATCH && push(sub as Effect | Scoper);
        break;
      default:
        if (flags & Flag.SETUP || !validate(sub, $)) flags = Flag.CLEAR;
        else sub.flags |= Flag.RECUR | Flag.READY, flags &= Flag.BEGIN;
    }
    mid: if (flags & Flag.BEGIN) {
      if (sub.subs && ($ = sub.subs).sub_next) stack.push(next);
      else continue top;
    } else if (!next) {
      while (stack.length) if ($ = stack.pop()!) break mid;
      break;
    } else $ = next;
    next = $.sub_next;
  } while (true);
};
const LINKED = { head: null, deps: null, subs: null, tail: null };
const make = <A extends Kind>(kind: A, flags: Flag, $: object) => {
  if ($ = Object.assign($, { kind, flags }, LINKED), kind & 2) {
    const prev = on;
    enlink(on = $ as Effect | Scoper, prev, 0);
    try {
      ($ as Effect | Scoper).run();
    } finally {
      on = prev;
    }
  }
  return $ as Extract<Node, { kind: A }>;
};
/** Reactive getter. */
export type Getter<A> = () => A;
/** Reactive setter. */
export type Setter<A> = <const B extends A>(next: B | ((prev: A) => B)) => B;
function Signal<A>(this: Signal<A>, ...$: [A]) {
  // Checking the rest parameter's length distinguishes between setting an
  // explicit undefined or getting by calling without arguments.
  if ($.length) {
    const next = typeof $[0] === "function" ? $[0](this.next) : $[0];
    // Passing through fulfills the setter type's const generic, and matches how
    // the native assignment operator works.
    if (this.is(next, this.next)) return next;
    this.next = next, this.flags = Flag.START;
    if (this.subs) deep(this.subs), depth || pull();
  } else {
    this.flags & Flag.DIRTY && reset(this) && this.subs && flat(this.subs);
    for (let sub = on; sub; sub = sub.subs?.sub!) {
      if (sub.flags & Flag.TRIED) {
        enlink(this, sub, step);
        break;
      }
    }
  }
  return this.next;
}
/** Creates a mutable data source. */
export const signal =
  (($: any, options?: { is?: Is<any, any> }) =>
    Signal.bind(make(
      Kind.SIGNAL,
      Flag.BEGIN,
      { next: $, prev: $, is: options?.is ?? Object.is },
    ))) as {
      <A>($: A, options?: { is?: Is<A, A> }): Getter<A> & Setter<A>;
      <A>(
        _?: A,
        options?: { is?: Is<A | undefined, A | undefined> },
      ): Getter<A | undefined> & Setter<A | undefined>;
    };
function Derive<A>(this: Derive<A>) {
  switch (this.flags & Flag.SETUP) {
    case Flag.CLEAR:
      break;
    case Flag.READY:
      if (!check(this, this.deps!)) {
        this.flags &= ~Flag.READY;
        break;
      } // falls through
    default:
      reget(this) && this.subs && flat(this.subs);
  }
  return enlink(this, on, step), this.prev;
}
/** Creates a computed derivation. */
export const derive =
  (($: any, options?: { initial?: any; is?: Is<any, any> }) =>
    Derive.bind(make(
      Kind.DERIVE,
      Flag.START,
      { next: $, prev: options?.initial, is: options?.is ?? Object.is },
    ))) as {
      // Omitting the initial value limits inference for the deriver's parameter
      // (see <https://github.com/microsoft/TypeScript/issues/47599>), so it'll
      // need an explicit type.
      <A>(
        $: (prev: A | undefined) => A,
        options?: { initial?: undefined; is?: Is<A | undefined, A> },
      ): Getter<A>;
      <A>(
        $: (prev: A) => A,
        options: { initial: A; is?: Is<A, A> },
      ): Getter<A>;
    };
/** Creates a disposable side-effectual sink. */
export const effect = ($: () => void): () => void =>
  dispose.bind(null, make(Kind.EFFECT, Flag.WATCH, { run: $ }));
/** Creates a disposable effects group owner. */
export const scoper = ($: () => void): () => void =>
  dispose.bind(null, make(Kind.SCOPER, Flag.CLEAR, { run: $ }));
