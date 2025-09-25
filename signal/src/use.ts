import { Flag, Kind } from "./flags.ts";
import type { Derive, Equals, Signal } from "./interface.ts";
import { link } from "./link.ts";
import { above, below, deep, flat, flush } from "./queue.ts";
import { get_actor, get_scope, reget, reset, reuse } from "./state.ts";
import { add, check, run } from "./try.ts";

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
/** Reactive getter. */
export type Getter<A> = () => A;
/** Reactive setter. */
export type Setter<A> = <const B extends A>($: B | (($: A) => B)) => B;
/** Creates a reactive value. */
export const signal =
  ((initial: any, options?: { equals?: Equals<any, any> }) =>
    sourcer.bind({
      kind: Kind.SIGNAL,
      flags: Flag.BEGIN,
      head: null,
      deps: null,
      subs: null,
      tail: null,
      next: initial,
      prev: initial,
      is: options?.equals,
    })) as {
      <A>($: A, options?: { equals?: Equals<A, A> }): Getter<A> & Setter<A>;
      <A>(
        _?: A,
        options?: { equals?: Equals<A | undefined, A | undefined> },
      ): Getter<A | undefined> & Setter<A | undefined>;
    };
/** Creates a derived computation. */
export const derive =
  ((compute: any, options?: { initial?: any; equals?: Equals<any, any> }) =>
    deriver.bind({
      kind: Kind.DERIVE,
      flags: Flag.RESET,
      head: null,
      deps: null,
      subs: null,
      tail: null,
      next: compute,
      prev: options?.initial,
      is: options?.equals,
    })) as {
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
export const effect = (run: () => void): () => void =>
  add({
    kind: Kind.EFFECT,
    flags: Flag.CLEAR,
    head: null,
    deps: null,
    subs: null,
    tail: null,
    run,
  });
/** Creates a disposable group of effects. */
export const scoper = (run: () => void): () => void =>
  add({
    kind: Kind.SCOPER,
    flags: Flag.CLEAR,
    head: null,
    deps: null,
    subs: null,
    tail: null,
    run,
  });
/** Pauses updates, executes a function, then resumes. */
export const batch = <A>($: () => A): A => {
  try {
    return above(), $();
  } finally {
    below() || flush(run);
  }
};
