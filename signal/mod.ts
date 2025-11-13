/** @module */
import { dispose, drop, enlink, validate } from "./link.ts";
import type {
  Derive,
  Effect,
  Is,
  Kind,
  Link,
  Node,
  Scoper,
  Signal,
} from "./node.ts";

const queue: (Effect | Scoper)[] = [];
let depth = 0, step = 0, on: Node | null = null;
/** Pauses updates, runs a function, then resumes. */
export const batch = <A>($: () => A): A => {
  try {
    return ++depth, $();
  } finally {
    --depth || pull();
  }
};
/** Manually sets the current subscriber. */
export const activate = ($: Node | null): Node | null => ([$, on] = [on, $], $);
const reset = ($: Signal) => (
  $.flags = 0b0000001, !$.is($.prev, $.prev = $.next)
);
const reget = ($: Derive) => {
  const prev = on;
  on = $, ++step, $.head = null, $.flags = 0b0010001;
  try {
    return !$.is($.prev, $.prev = $.next($.prev));
  } finally {
    on = prev, drop($);
  }
};
const retry = ($: Node) => $.kind === 0 && reset($) || $.kind === 1 && reget($);
const check = (sub: Node, $: Link) => {
  const stack: (Link | null)[] = [];
  let size = 0, dirty = false, dep, link;
  do {
    if (sub.flags & 0b0001000) dirty = true;
    else if (dep = $.dep, (dep.flags & 0b0001001) === 0b0001001) {
      if (retry(dep)) dep.subs!.nextSub && flat(dep.subs!), dirty = true;
    } else if ((dep.flags & 0b0000101) === 0b0000101) {
      ($.nextSub || $.prevSub) && stack.push($), ++size, $ = (sub = dep).deps!;
      continue;
    }
    mid: if (dirty || !$.nextDep) {
      while (size--) {
        link = sub.subs!, $ = link.nextSub ? stack.pop()! : link;
        if (!dirty) sub.flags &= ~0b0000100;
        else if (retry(sub)) link.nextSub && flat(link), sub = $.sub;
        else if (sub = $.sub, $.nextDep) break mid;
        else dirty = false;
      }
      return dirty;
    }
    $ = $.nextDep;
  } while (true);
};
const run = ($: Effect | Scoper) => {
  switch (($.flags &= ~0b1000000) & 0b0001100) {
    case 0b0000100:
      if (check($, $.deps!)) break;
      $.flags &= ~0b0000100; // falls through
    case 0b0000000:
      for (let next = $.deps; next; next = next.nextDep) {
        next.dep.flags & 0b1000000 && run(next.dep as Effect | Scoper);
      }
      return;
  }
  const prev = on;
  try {
    on = $, ++step, $.head = null, $.flags = 0b0010010, $.run();
  } finally {
    on = prev, drop($);
  }
};
const pull = () => {
  for (let first; first = queue.shift(); run(first));
};
const push = ($: Effect | Scoper) => {
  do if ($.flags & 0b1000000) return;
  else if ($.flags |= 0b1000000, $.subs) $ = $.subs.sub as Effect | Scoper;
  else return queue.push($); while ($);
};
const flat = ($: Link) => {
  do ($.sub.flags & 0b0001100) === 0b0000100 &&
    ($.sub.flags |= 0b0001000) & 0b0000010 &&
    push($.sub as Effect | Scoper); while ($ = $.nextSub!);
};
const deep = ($: Link) => {
  const stack: (Link | null)[] = [];
  let next = $.nextSub, sub, flags;
  top: do {
    switch (sub = $.sub, (flags = sub.flags) & 0b0111100) {
      case 0b0100000:
        sub.flags &= ~0b0100000; // falls through
      case 0b0000000:
        sub.flags |= 0b0000100, flags & 0b0000010 && push(sub as Effect);
        break;
      default:
        if (flags & 0b0001100 || !validate(sub, $)) flags = 0b0000000;
        else sub.flags |= 0b0100100, flags &= 0b0000001;
    }
    mid: if (flags & 0b0000001) {
      if (sub.subs && ($ = sub.subs).nextSub) stack.push(next);
      else continue top;
    } else if (!next) {
      while (stack.length) if ($ = stack.pop()!) break mid;
      break;
    } else $ = next;
    next = $.nextSub;
  } while (true);
};
const LINKED = { head: null, deps: null, subs: null, tail: null };
const make = <A extends Kind>(kind: A, flags: number, $: any) => {
  if ($ = Object.assign($, { kind, flags }, LINKED), kind & 2) {
    const prev = on;
    try {
      enlink(on = $ as Effect | Scoper, prev, 0), ($ as Effect | Scoper).run();
    } finally {
      on = prev;
    }
  } else $.is ??= Object.is;
  return $ as Extract<Node, { kind: A }>;
};
/** Reactive getter. */
export type Getter<A> = () => A;
/** Reactive setter. */
export type Setter<A> = <const B extends A>(next: B | ((prev: A) => B)) => B;
// deno-lint-ignore libn/naming-convention
function Signal<A>(this: Signal<A>, ...$: [A]) {
  // Checking the rest parameter's length distinguishes between setting an
  // explicit undefined or getting by calling without arguments.
  if ($.length) {
    const next = typeof $[0] === "function" ? $[0](this.next) : $[0];
    // Passing through fulfills the setter type's const generic, and matches how
    // the native assignment operator works.
    if (this.is(next, this.next)) return next;
    this.next = next, this.flags = 0b0001001;
    if (this.subs) deep(this.subs), depth || pull();
  } else {
    this.flags & 0b0001000 && reset(this) && this.subs && flat(this.subs);
    for (let sub = on; sub; sub = sub.subs?.sub!) {
      if (sub.flags & 0b0000011) return enlink(this, sub, step), this.next;
    }
  }
  return this.next;
}
/** Creates a mutable data source. */
export const signal =
  (($: any, { is }: { is?: Is<any, any> } = {}) =>
    Signal.bind(make(0, 0b0000001, { next: $, prev: $, is }))) as {
      <A>($: A, options?: { is?: Is<A, A> }): Getter<A> & Setter<A>;
      <A>(
        _?: A,
        options?: { is?: Is<A | undefined, A | undefined> },
      ): Getter<A | undefined> & Setter<A | undefined>;
    };
// deno-lint-ignore libn/naming-convention
function Derive<A>(this: Derive<A>) {
  switch (this.flags & 0b0001100) {
    case 0b0000000:
      break;
    case 0b0000100:
      if (!check(this, this.deps!)) {
        this.flags &= ~0b0000100;
        break;
      } // falls through
    default:
      reget(this) && this.subs && flat(this.subs);
  }
  return enlink(this, on, step), this.prev;
}
/** Creates a computed derivation. */
export const derive =
  (($: any, { initial, is }: { initial?: any; is?: Is<any, any> } = {}) =>
    Derive.bind(make(1, 0b0001001, { next: $, prev: initial, is }))) as {
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
  dispose.bind(null, make(2, 0b0000010, { run: $ }));
/** Creates a disposable effects group owner. */
export const scoper = ($: () => void): () => void =>
  dispose.bind(null, make(3, 0b0000000, { run: $ }));
