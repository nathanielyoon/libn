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
/** Manually gets the current subscriber. */
export const get_actor = (): Node | null => actor;
/** Manually sets the current subscriber. */
export const set_actor = ($: Node | null): Node | null => (
  swap = actor, actor = $, swap
);
/** Manually gets the current context. */
export const get_scope = (): Scoper | null => scope;
/** Manually sets the current context. */
export const set_scope = ($: Scoper | null): Scoper | null => (
  swap = scope, scope = $, swap
);
/** Checks whether a value differs. */
export const reuse = <A>($: Signal | Derive, prev: A, next: A): boolean => {
  switch ($.is) {
    case undefined:
      return prev !== next;
    case false:
      return true;
    default:
      return !$.is(prev, next);
  }
};
/** Updates a value. */
export const reset = ($: Signal): boolean => (
  $.flags = Flag.BEGIN, reuse($, $.prev, $.prev = $.next)
);
/** Updates a computation. */
export const reget = ($: Derive): boolean => {
  const a = set_actor($);
  try {
    return follow($), reuse($, $.prev, $.prev = $.next($.prev));
  } finally {
    actor = a, ignore($);
  }
};
/** If applicable, updates a source. */
export const retry = ($: Node): boolean =>
  $.kind === Kind.SIGNAL && reset($) || $.kind === Kind.DERIVE && reget($);
/** Determines whether a node is dirty. */
export const check = (sub: Node, $: Link): boolean => {
  const stack: (Link | null)[] = [];
  let b = 0, c = false, d, e;
  do {
    d = $.dep;
    if (sub.flags & Flag.DIRTY) c = true;
    else if ((d.flags & Flag.RESET) === Flag.RESET) {
      if (retry(d)) c = true, d.subs!.sub_next && flat(d.subs!);
    } else if ((d.flags & Flag.CAUSE) === Flag.CAUSE) {
      ($.sub_next || $.sub_prev) && stack.push($), ++b, sub = d, $ = d.deps!;
      continue;
    }
    mid: if (c || !$.dep_next) {
      while (b--) {
        e = sub.subs!, $ = e.sub_next ? stack.pop()! : e;
        if (!c) sub.flags &= ~Flag.READY;
        else if (retry(sub)) e.sub_next && flat(e), sub = $.sub;
        else if (sub = $.sub, $.dep_next) break mid;
        else c = false;
      }
      return c;
    }
    $ = $.dep_next;
  } while (true);
};
/** Runs effects. */
export const run = ($: Effect | Scoper): void => {
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
    link(this, get_actor());
  }
  return this.next;
}
function deriver(this: Derive) {
  this.flags & Flag.DIRTY || this.flags & Flag.READY && check(this, this.deps!)
    ? reget(this) && this.subs && flat(this.subs)
    : (this.flags &= ~Flag.READY);
  return link(this, get_scope() ?? get_actor()), this.prev;
}
const node = <A extends Kind, B>(kind: A, flags: Flag, rest: B) => (
  { kind, flags, head: null, deps: null, subs: null, tail: null, ...rest }
);
/** Reactive getter. */
export type Getter<A> = () => A;
/** Reactive setter. */
export type Setter<A> = <const B extends A>($: B | (($: A) => B)) => B;
/** Creates a reactive value. */
export const signal =
  ((initial: any, options?: { equals?: Equals<any, any> }) =>
    sourcer.bind(node(Kind.SIGNAL, Flag.BEGIN, {
      next: initial,
      prev: initial,
      is: options?.equals,
    }))) as {
      <A>($: A, options?: { equals?: Equals<A, A> }): Getter<A> & Setter<A>;
      <A>(
        _?: A,
        options?: { equals?: Equals<A | undefined, A | undefined> },
      ): Getter<A | undefined> & Setter<A | undefined>;
    };
/** Creates a derived computation. */
export const derive =
  ((compute: any, options?: { initial?: any; equals?: Equals<any, any> }) =>
    deriver.bind(node(Kind.DERIVE, Flag.RESET, {
      next: compute,
      prev: options?.initial,
      is: options?.equals,
    }))) as {
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
export const effect = (run: () => void): () => void => {
  const a = node(Kind.EFFECT, Flag.CLEAR, { run }), b = set_actor(a);
  link(a, get_scope() ?? b);
  try {
    run();
  } finally {
    set_actor(b);
  }
  return dispose.bind(null, a);
};
/** Creates a disposable group of effects. */
export const scoper = (run: () => void): () => void => {
  const a = node(Kind.SCOPER, Flag.CLEAR, { run }), b = set_actor(null);
  const c = set_scope(a);
  link(a, c);
  try {
    run();
  } finally {
    set_actor(b), set_scope(c);
  }
  return dispose.bind(null, a);
};
/** Pauses updates, executes a function, then resumes. */
export const batch = <A>($: () => A): A => {
  try {
    return above(), $();
  } finally {
    below() || flush(run);
  }
};
