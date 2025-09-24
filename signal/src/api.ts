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
const construct = <A extends Kind, B>(kind: A, flags: Flag, rest: B) => (
  { kind, flags, head: null, dep: null, sub: null, tail: null, ...rest }
);
/** Reactive getter. */
export type Getter<A> = () => A;
/** Reactive setter. */
export type Setter<A> = <const B extends A>($: B | (($: A) => B)) => B;
/** Creates a reactive value. */
export const signal =
  ((initial: any, options?: { equals?: Equals<any, any> }) =>
    sourcer.bind(construct(Kind.SIGNAL, Flag.BEGIN, {
      prev: initial,
      next: initial,
      same: options?.equals,
    }))) as {
      <A>(
        initial: A,
        options?: { equals?: Equals<A, A> },
      ): Getter<A> & Setter<A>;
      <A>(
        _?: A,
        options?: { equals?: Equals<A | undefined, A | undefined> },
      ): Getter<A | undefined> & Setter<A | undefined>;
    };
/** Creates a derived computation. */
export const derive =
  // Omitting the initial value limits type inference for the deriver's
  // parameter (see <https://github.com/microsoft/TypeScript/issues/47599>),
  // but it works fine if you add an explicit type.
  ((compute: any, options?: { initial?: any; equals?: Equals<any, any> }) =>
    deriver.bind(construct(Kind.DERIVE, Flag.RESET, {
      prev: options?.initial,
      next: compute,
      same: options?.equals,
    }))) as {
      <A>(
        compute: (prev: A | undefined) => A,
        options?: { initial?: undefined; equals?: Equals<A | undefined, A> },
      ): Getter<A>;
      <A>(
        compute: (prev: A) => A,
        options: { initial: A; equals?: Equals<A, A> },
      ): Getter<A>;
    };
/** Creates a side effect and returns a disposer. */
export const effect = (run: () => void): () => void => {
  const node = construct(Kind.EFFECT, Flag.WATCH, { run });
  link(node, scope ?? actor);
  const prev_actor = set_actor(node);
  try {
    node.run();
  } finally {
    set_actor(prev_actor);
  }
  return dispose.bind(node);
};
/** Creates a group of effects and returns a disposer. */
export const scoper = (all: () => void): () => void => {
  const node = construct(Kind.SCOPER, Flag.CLEAR, {});
  link(node, scope);
  const prev_actor = set_actor(null), prev_scope = set_scope(node);
  try {
    all();
  } finally {
    set_actor(prev_actor), set_scope(prev_scope);
  }
  return dispose.bind(node);
};
/** Pauses updates, executes a function, then resumes. */
export const batch = <A>($: () => A): A => {
  try {
    return above(), $();
  } finally {
    below() || flush(run);
  }
};
