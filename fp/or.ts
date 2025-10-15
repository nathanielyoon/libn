/** Failure/success discriminated union. */
export type Or<A = any, B = any> =
  & ({ state: false; value: A } | { state: true; value: B })
  & { [Symbol.iterator](): Generator<Or<A, B>, B, any> };
/** Failure value. */
export type No<A extends Or> = Extract<A, { state: false }>["value"];
/** Success value. */
export type Ok<A extends Or> = Extract<A, { state: true }>["value"];
/** Generator function to bind. */
export function* generate<A, B>(this: Or<A, B>): Generator<Or<A, B>, B, any> {
  return yield this;
}
/** Creates a success. */
export const fail = <const A>($: A): Or<A, never> => (
  { state: false, value: $, [Symbol.iterator]: generate }
);
/** Creates a failure. */
export const pass = <const A>($: A): Or<never, A> => (
  { state: true, value: $, [Symbol.iterator]: generate }
);
