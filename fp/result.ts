/** Failure/success discriminated union. */
export type Result<A = any, B = any> =
  | { state: false; value: A }
  | { state: true; value: B };
/** Result that can be delegated to in a generator function. */
export type Yieldable<A = any, B = any> = Result<A, B> & {
  [Symbol.iterator](): Generator<Yieldable<A, B>, B>;
};
/** Failure value. */
export type No<A extends Result> = Extract<A, { state: false }>["value"];
/** Success value. */
export type Ok<A extends Result> = Extract<A, { state: true }>["value"];
function* generate<A, B>(this: Yieldable<A, B>): Generator<Yieldable<A, B>, B> {
  return yield this;
}
/** Creates a yieldable failure. */
export const fail = <const A>($: A): Yieldable<A, never> => (
  { state: false, value: $, [Symbol.iterator]: generate }
);
/** Creates a yieldable success. */
export const pass = <const A>($: A): Yieldable<never, A> => (
  { state: true, value: $, [Symbol.iterator]: generate }
);
/** Coerced-to-false values (except `NaN`, which isn't representable here). */
export type Falsy = undefined | null | false | 0 | 0n | "";
/** Creates a failure if falsy or a success if truthy. */
export const some = <const A>($: A): Yieldable<
  Extract<Falsy, A>,
  Exclude<A, Falsy>
> => $ ? pass($ as Exclude<A, Falsy>) : fail($ as Extract<Falsy, A>);
