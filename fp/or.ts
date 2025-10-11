/** Failure/success discriminated union. */
export type Or<A = any, B = any> =
  | { state: false; value: A }
  | { state: true; value: B };
/** Failure value. */
export type No<A extends Or> = Extract<A, { state: false }>["value"];
/** Success value. */
export type Ok<A extends Or> = Extract<A, { state: true }>["value"];
/** Creates a failure. */
export const no = <const A = undefined>($?: A): Or<A, never> => (
  { state: false, value: $! }
);
/** Creates a success. */
export const ok = <const A = undefined>($?: A): Or<never, A> => (
  { state: true, value: $! }
);
/** Falsy values (except `NaN`, which isn't representable). */
export type Falsy = undefined | null | false | 0 | 0n | "";
/** Creates a failure (if falsy) or a success (if truthy). */
export const or = <const A>($: A): Or<Extract<Falsy, A>, Exclude<A, Falsy>> => (
  { state: Boolean($), value: $ } as Or
);
