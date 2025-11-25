/** @internal */
import type { Json } from "@libn/types";

/** Failure or success. */
export type Result<A = any, B = unknown> = Ok<A> | Err<B>;
/** Success wrapper. */
export interface Ok<A> {
  /** Tag for result type. */
  state: true;
  /** Inner value. */
  value: A;
}
const toJson = <A>($: A) => {
  try { // could throw
    return JSON.parse(JSON.stringify($));
  } catch { /* empty */ }
};
/** Failure wrapper. */
export class Err<A> extends Error {
  /** Wraps a thrown value. */
  static catch($: unknown): Err<unknown> {
    if (!($ instanceof Error)) return new Err($);
    const err = new Err($.cause, $.message);
    if ($.stack) err.stack = $.stack;
    return err;
  }
  /** Wraps an unsafe function. */
  static try<A>(unsafe: () => A): Result<A> {
    try {
      return { state: true, value: unsafe() };
    } catch (thrown) {
      return Err.catch(thrown);
    }
  }
  /** Wraps an unsafe asynchronous function. */
  static async tryAsync<A>(unsafe: () => Promise<A>): Promise<Result<A>> {
    try {
      return { state: true, value: await unsafe() };
    } catch (thrown) {
      return Err.catch(thrown);
    }
  }
  /** Tag for result type. */
  readonly state = false;
  /** Throws itself. */
  get value(): never {
    throw this;
  }
  /** Initial value. */
  declare cause: A;
  /** Information attached while bubbling up. */
  context: { info: string; data?: Json }[] = [];
  /** Creates a new error. */
  constructor(cause: A, message?: string) {
    super(message, { cause });
    this.name = Err.name;
  }
  /** Attaches context. */
  with(info: string, data: Json = null): this {
    return this.context.push({ info, data }), this;
  }
  /** Serializes. */
  toJSON(): {
    name: string;
    message: string;
    cause: A | undefined;
    context: Err<A>["context"];
    stack: string | undefined;
  } {
    return {
      name: this.name,
      message: this.message,
      cause: toJson(this.cause),
      context: this.context,
      stack: this.stack,
    };
  }
}
