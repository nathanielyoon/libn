/** Slighty better error type. */
export class Err<const A extends string, B = void> extends Error {
  /** Throws an error (but in a usable-as-an-expression way). */
  static throw<const A extends string, B = void>(message: A, cause?: B): never {
    throw new Err(message, cause);
  }
  /** Brief message. */
  declare message: A;
  /** Cause for raising. */
  declare cause: B;
  /** Constructs. */
  constructor(message: A, cause?: B) {
    super(message, { cause });
  }
  /** Serializes. */
  toJSON(): { name: string; message: A; cause: B; stack: string | undefined } {
    return {
      name: this.name,
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
