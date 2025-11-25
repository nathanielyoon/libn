# @libn/result

Simple result handling.

## default

Handle errors like
[Rust's std::result](https://doc.rust-lang.org/std/result/#the-question-mark-operator-)
and [Go's `if err != nil`](https://go.dev/blog/errors-are-values).

```ts
import { Err } from "@libn/result";
import { assertThrows } from "@std/assert";

// `JSON.parse` can fail
const parseUnsafe = (json: string) => JSON.parse(json);
assertThrows(() => parseUnsafe(""));

// Wrap in a `Result`
const parseSafe = (json: string) => Err.try(() => JSON.parse(json));
const result = parseSafe("");
if (result.state) result.value; // narrow type
else result.with("Parsing failed"); // attach context
```
