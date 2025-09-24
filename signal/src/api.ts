import { Flag, Kind } from "./flags.ts";
import type { Derive, Equals, Signal } from "./nodes.ts";
import { dispose, link, update } from "./link.ts";
import {
  actor,
  check,
  reget,
  reuse,
  run,
  scope,
  set_actor,
  set_scope,
} from "./state.ts";
import { above, below, deep, flat, flush } from "./queue.ts";

function sourcer(this: Signal, ...$: [unknown]) {
  // Checking the rest parameter's length distinguishes between setting an
  // explicit undefined or getting by calling without arguments.
  if ($.length) {
    const next = typeof $[0] === "function" ? $[0](this.next) : $[0];
    // Passing through fulfills the setter type's const generic, and matches
    // how the native assignment operator works.
    if (!update(this, next, this.next)) return next;
    this.next = next, this.flags = Flag.RESET, this.sub && deep(this.sub, run);
  } else {
    if (this.flags & Flag.DIRTY && reuse(this) && this.sub) flat(this.sub);
    link(this, actor);
  }
  return this.next;
}
function deriver(this: Derive) {
  this.flags & Flag.DIRTY || this.flags & Flag.READY && check(this, this.dep!)
    ? reget(this) && this.sub && flat(this.sub)
    : (this.flags &= ~Flag.READY);
  return link(this, scope ?? actor), this.prev;
}
const node = <A extends Kind, B>(kind: A, flags: Flag, rest: B) => (
  { kind, flags, head: null, dep: null, sub: null, tail: null, ...rest }
);
/** Reactive getter. */
export type Get<A> = () => A;
/** Reactive setter. */
export type Set<A> = <const B extends A>($: B | (($: A) => B)) => B;
/** Creates a reactive value. */
export const signal =
  ((initial: any, equals?: Equals<any, any>) =>
    sourcer.bind(node(Kind.SIGNAL, Flag.BEGIN, {
      prev: initial,
      next: initial,
      same: equals,
    }))) as {
      <A>(initial: A, equals?: Equals<A, A> | false): Get<A> & Set<A>;
      <A>(
        _?: A,
        equals?: Equals<A | undefined, A | undefined> | false,
      ): Get<A | undefined> & Set<A | undefined>;
    };
/** Creates a derived computation. */
export const derive =
  ((compute: any, initial?: any, equals?: Equals<any, any>) =>
    deriver.bind(node(Kind.DERIVE, Flag.RESET, {
      prev: initial,
      next: compute,
      same: equals,
    }))) as {
      <A>(compute: (was: A) => A, initial: A, equals?: Equals<A, A>): () => A;
      // Omitting the initial value limits type inference for the deriver's
      // parameter (see <https://github.com/microsoft/TypeScript/issues/47599>).
      <A>(
        compute: (was: A | undefined) => A,
        initial?: undefined,
        equals?: Equals<A | undefined, A>,
      ): () => A;
    };
/** Creates a side effect and returns a disposer. */
export const effect = (run: () => void): () => void => {
  const a = node(Kind.EFFECT, Flag.WATCH, { run });
  link(a, scope ?? actor);
  const b = set_actor(a);
  try {
    a.run();
  } finally {
    set_actor(b);
  }
  return dispose.bind(a);
};
/** Creates a group of effects and returns a disposer. */
export const scoper = (all: () => void): () => void => {
  const a = node(Kind.SCOPER, Flag.CLEAR, {});
  link(a, scope);
  const b = set_actor(null), c = set_scope(a);
  try {
    all();
  } finally {
    set_actor(b), set_scope(c);
  }
  return dispose.bind(a);
};
/** Pauses updates, executes a function, then resumes. */
export const batch = <A>($: () => A): A => {
  try {
    return above(), $();
  } finally {
    below() || flush(run);
  }
};
