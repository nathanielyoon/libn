const enum Color {
  DIRTY,
  CHECK,
  CLEAN,
}
type Is<A> = (one: A, two: A) => any;
let VALUE: Node | null = null, QUEUE: Node[] = [], AT = 0;
class Node<A = any> {
  private color: Color;
  private source: A;
  private target: (() => A) | null;
  private of: Node[] = [];
  private to: Node[] = [];
  constructor($: A | (() => A), private is: Is<A> = Object.is) {
    if (typeof $ === "function") {
      this.color = Color.DIRTY;
      this.source = undefined as A, this.target = $ as () => A;
    } else this.color = Color.CLEAN, this.source = $, this.target = null;
  }
  private check(color: Color) {
    if (this.color > color) {
      this.color = color;
      for (let z = 0; z < this.to.length; ++z) this.to[z].check(Color.CHECK);
    }
  }
  private clear(dep: number) {
    for (let a, z; dep < this.of.length; ++dep) {
      for (a = this.of[dep], z = 0; z < a.to.length; ++z) {
        if (a.to[z] === this) {
          a.to[z] = a.to[a.to.length - 1], a.to.pop();
          break;
        }
      }
    }
  }
  private update() {
    if (this.color === Color.CHECK) {
      for (let z = 0; z < this.of.length; ++z) {
        if (this.of[z].update(), !this.color) break;
      }
    }
    if (this.color === Color.DIRTY) {
      const a = this.source, b = VALUE, c = QUEUE, d = AT;
      VALUE = this, QUEUE = [], AT = 0;
      try {
        if (this.source = this.target!(), QUEUE.length) {
          if (this.clear(AT), AT) {
            this.of.length = AT + QUEUE.length;
            for (let z = 0; z < QUEUE.length; ++z) this.of[AT + z] = QUEUE[z];
          } else this.of = QUEUE;
          for (let z = AT; z < this.of.length; ++z) this.of[z].to.push(this);
        } else if (AT < this.of.length) this.clear(AT), this.of.length = AT;
      } finally {
        VALUE = b, QUEUE = c, AT = d;
      }
      if (!this.is(a, this.source)) {
        for (let z = 0; z < this.to.length; ++z) this.to[z].color = Color.DIRTY;
      }
    }
    this.color = Color.CLEAN;
  }
  get() {
    VALUE && (QUEUE.length || VALUE.of[AT] !== this ? QUEUE.push(this) : AT++);
    return this.target && this.update(), this.source;
  }
  set($: A | (() => A)) {
    if (typeof $ !== "function") {
      if (this.target) this.clear(0), this.target = null, this.of = [];
      if (!this.is(this.source, $ as A)) {
        for (let z = 0; z < this.to.length; ++z) this.to[z].check(Color.DIRTY);
        this.source = $ as A;
      }
    } else $ !== this.target && this.check(Color.DIRTY), this.target = $ as any;
    return this.source;
  }
}
/** Combined getter/setter for a reactive node. */
export type State<A> = { (): A; <const B extends A>($: B): B; ($: () => A): A };
/** Creates a reactive node. */
export const state = <A>($: A | (() => A), is: Is<A> = Object.is): State<A> => {
  const a = new Node($, is);
  return ((...$: [A]) => $.length ? a.set($[0]) : a.get()) as State<A>;
};
