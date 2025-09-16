/** Slighty better error type. */
export class Err<const A extends string, B = void> extends Error {
  /** Throws an error (but in a usable-as-an-expression way). */
  static throw<A extends string, B = void>(message: A, cause?: B): never {
    throw new Err(message, cause);
  }
  /** Wraps an arbitrary value. */
  static catch<A extends string = "">(message?: A): <B>($: B) => Err<A, B> {
    return ($) => new Err(message!, $);
  }
  /** Brief message. */
  declare message: A;
  /** Cause for raising. */
  declare cause: B;
  /** Constructs a sort-of-typed error. */
  constructor(message: A, cause?: B) {
    super(message, { cause });
  }
  /** Serializes relevant data. */
  toJSON(): { message: A; cause: B; stack: string | undefined } {
    return {
      message: this.message,
      cause: this.cause,
      stack: this.stack,
    };
  }
  /** Stringifies. */
  override toString(): string {
    return `${this.name}: ${this.message}
Cause: ${JSON.stringify(this.cause)}
${this.stack}`;
  }
}
