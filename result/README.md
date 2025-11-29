# @libn/result

Simple result handling.

## default

Handle errors like
[Rust's `std::result`](https://doc.rust-lang.org/std/result/#the-question-mark-operator-)
and [Go's (in)famous `if err != nil`](https://go.dev/blog/errors-are-values).

```ts
import { as, open, seal, wrap } from "@libn/result";

// Define possible errors and their corresponding values
type Errors = {
  NonStringInput: unknown;
  InvalidJson: Error;
};
const parse = (raw: unknown) =>
  // Parameterize symbol with errors
  wrap(as<Errors>(), (no) => {
    // Throw as expression
    const json = typeof raw === "string" ? raw : no("NonStringInput", raw);
    // Wrap unsafe functions
    const result = seal(JSON.parse, "InvalidJson")(json);
    // Re-throw when types are compatible
    return open(result, { InvalidJson: no });
  });
```
