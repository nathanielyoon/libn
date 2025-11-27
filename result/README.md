# @libn/result

Simple result handling.

## default

Handle errors like
[Rust's std::result](https://doc.rust-lang.org/std/result/#the-question-mark-operator-).

```ts
import { define, wrap } from "@libn/result";

// Define possible errors and their associated values
export type Errors = { NotArray: unknown; TooLong: number };
export const parse = (json: string) =>
  wrap(
    // Use them to parameterize the symbol
    define<Errors>(),
    // Do stuff unsafely with throw helper
    (no) => {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) return no("NotArray", parsed);
      return parsed.length < 10 ? parsed : no("TooLong", parsed.length);
    },
    // Name to capture thrown `Error`s
    "InvalidJson",
  );
```
