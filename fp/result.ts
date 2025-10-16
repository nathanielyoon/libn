/** Failure/success discriminated union. */
export type Result<A = any, B = any> =
  & ({ state: false; value: A } | { state: true; value: B })
  & { [Symbol.iterator](): Generator<Result<A, B>, B, any> };
/** Failure value. */
export type No<A extends Result> = Extract<A, { state: false }>["value"];
/** Success value. */
export type Ok<A extends Result> = Extract<A, { state: true }>["value"];
function* generate<A, B>(this: Result<A, B>): Generator<Result<A, B>, B, any> {
  return yield this;
}
/** Creates a failure. */
export const fail = <const A>($: A): Result<A, never> => (
  { state: false, value: $, [Symbol.iterator]: generate }
);
/** Creates a success. */
export const pass = <const A>($: A): Result<never, A> => (
  { state: true, value: $, [Symbol.iterator]: generate }
);
/** Coerced-to-false values (except `NaN`, which isn't representable here). */
export type Falsy = undefined | null | false | 0 | 0n | "";
/** Creates a failure if falsy or a success if truthy. */
export const some = <const A>($: A): Result<
  Extract<Falsy, A>,
  Exclude<A, Falsy>
> => $ ? pass($ as Exclude<A, Falsy>) : fail($ as Extract<Falsy, A>);
