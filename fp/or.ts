/** Failure/success discriminated union. */
export type Or<A = any, B = any> =
  & ({ is: false; of: A } | { is: true; of: B })
  & { [Symbol.iterator](): Generator<Or<A, B>, B, any> };
/** Failure value. */
export type No<A extends Or> = Extract<A, { is: false }>["of"];
/** Success value. */
export type Ok<A extends Or> = Extract<A, { is: true }>["of"];
/** Generator function to bind. */
export function* generate<A, B>(this: Or<A, B>): Generator<Or<A, B>, B, any> {
  return yield this;
}
/** Creates a success. */
export const no = <const A>($: A): Or<A, never> => (
  { is: false, of: $, [Symbol.iterator]: generate }
);
/** Creates a failure. */
export const ok = <const A>($: A): Or<never, A> => (
  { is: true, of: $, [Symbol.iterator]: generate }
);
