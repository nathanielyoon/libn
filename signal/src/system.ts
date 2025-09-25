import {
  type Derive,
  type Effect,
  type Equals,
  Flag,
  Kind,
  type Link,
  type Node,
  type Scoper,
  type Signal,
} from "./node.ts";
import { dispose, follow, ignore, link } from "./link.ts";
import { above, below, deep, flat, flush } from "./queue.ts";

let actor: Node | null = null, scope: Scoper | null = null, swap;
/** Manually sets the current subscriber. */
export const set_actor = ($: Node | null): Node | null => (
  swap = actor, actor = $, swap
);
const reuse = <A>($: Signal | Derive, prev: A, next: A) => {
  switch ($.is) {
    case undefined:
      return prev !== next;
    case false:
      return true;
    default:
      return !$.is(prev, next);
  }
};
const reset = ($: Signal) => (
  $.flags = Flag.BEGIN, reuse($, $.prev, $.prev = $.next)
);
const reget = ($: Derive) => {
  const a = actor;
  try {
    return follow(actor = $), reuse($, $.prev, $.prev = $.next($.prev));
  } finally {
    actor = a, ignore($);
  }
};
const retry = ($: Node) =>
  $.kind === Kind.SIGNAL && reset($) || $.kind === Kind.DERIVE && reget($);
const check = (sub: Node, $: Link): boolean => {
  const stack: (Link | null)[] = [];
  let dirty = false, size = 0;
  do {
    const dep = $.dep;
    if (sub.flags & Flag.DIRTY) dirty = true;
    else if ((dep.flags & Flag.RESET) === Flag.RESET) {
      if (retry(dep)) dirty = true, dep.subs!.sub_next && flat(dep.subs!);
    } else if ((dep.flags & Flag.CAUSE) === Flag.CAUSE) {
      if ($.sub_next || $.sub_prev) stack.push($);
      ++size, sub = dep, $ = dep.deps!;
      continue;
    }
    mid: if (dirty || !$.dep_next) {
      while (size--) {
        const link = sub.subs!;
        $ = link.sub_next ? stack.pop()! : link;
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
  $.flags &= ~Flag.QUEUE;
  switch ($.flags & Flag.SETUP) {
    case Flag.SETUP:
    case Flag.DIRTY:
      break;
    case Flag.READY:
      if (check($, $.deps!)) break;
      $.flags &= ~Flag.READY; // falls through
    default:
      for (let a = $.deps; a; a = a.dep_next) { // recur into inner effects
        a.dep.flags & Flag.QUEUE && run(a.dep as Effect | Scoper);
      }
      return;
  }
  const a = set_actor($);
  try {
    return follow($), $.run(); // calls inner effects too
  } finally {
    set_actor(a), ignore($);
  }
};
function sourcer(this: Signal, ...$: [unknown]) {
  // Checking the rest parameter's length distinguishes between setting an
  // explicit undefined or getting by calling without arguments.
  if ($.length) {
    const next = typeof $[0] === "function" ? $[0](this.next) : $[0];
    // Passing through fulfills the setter type's const generic, and matches how
    // the native assignment operator works.
    if (!reuse(this, next, this.next)) return next;
    this.next = next, this.flags = Flag.RESET;
    this.subs && deep(this.subs, run);
  } else {
    if (this.flags & Flag.DIRTY && reset(this) && this.subs) flat(this.subs);
    link(this, actor);
  }
  return this.next;
}
function deriver(this: Derive) {
  switch (this.flags & Flag.SETUP) { // `case Flag.BEGIN` is no-op
    case Flag.READY:
      if (!check(this, this.deps!)) {
        this.flags &= ~Flag.READY;
        break;
      } // falls through
    case Flag.DIRTY:
    case Flag.SETUP:
      reget(this) && this.subs && flat(this.subs);
  }
  return link(this, scope ?? actor), this.prev;
}
const make = <A extends Kind, B>(kind: A, flags: Flag, rest: B) => (
  { kind, flags, head: null, deps: null, subs: null, tail: null, ...rest }
);
/** Reactive getter. */
export type Getter<A> = () => A;
/** Reactive setter. */
export type Setter<A> = <const B extends A>($: B | (($: A) => B)) => B;
/** Creates a reactive value. */
export const signal =
  (($: any, options?: { equals?: Equals<any, any> }) =>
    sourcer.bind(make(
      Kind.SIGNAL,
      Flag.BEGIN,
      { next: $, prev: $, is: options?.equals },
    ))) as {
      <A>($: A, options?: { equals?: Equals<A, A> }): Getter<A> & Setter<A>;
      <A>(
        _?: A,
        options?: { equals?: Equals<A | undefined, A | undefined> },
      ): Getter<A | undefined> & Setter<A | undefined>;
    };
/** Creates a derived computation. */
export const derive =
  (($: any, options?: { initial?: any; equals?: Equals<any, any> }) =>
    deriver.bind(make(
      Kind.DERIVE,
      Flag.RESET,
      { next: $, prev: options?.initial, is: options?.equals },
    ))) as {
      // Omitting the initial value limits inference for the deriver's parameter
      // (see <https://github.com/microsoft/TypeScript/issues/47599>), so it'll
      // need an explicit type.
      <A>(
        $: (prev: A | undefined) => A,
        options?: { initial?: undefined; equals?: Equals<A | undefined, A> },
      ): Getter<A>;
      <A>(
        $: (prev: A) => A,
        options: { initial: A; equals?: Equals<A, A> },
      ): Getter<A>;
    };
/** Creates a disposable side effect. */
export const effect = ($: () => void): () => void => {
  const node = make(Kind.EFFECT, Flag.CLEAR, { run: $ }), a = set_actor(node);
  link(node, scope ?? a);
  try {
    $();
  } finally {
    set_actor(a);
  }
  return dispose.bind(null, node);
};
/** Creates a disposable group of effects. */
export const scoper = ($: () => void): () => void => {
  // Nothing calls this `run` property, but it makes the types more consistent.
  const node = make(Kind.SCOPER, Flag.CLEAR, { run: $ }), a = actor, b = scope;
  actor = null, link(scope = node, b);
  try {
    $();
  } finally {
    actor = a, scope = b;
  }
  return dispose.bind(null, node);
};
/** Pauses updates, executes a function, then resumes. */
export const batch = <A>($: () => A): A => {
  try {
    return above(), $();
  } finally {
    below() || flush(run);
  }
};
