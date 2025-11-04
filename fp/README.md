# @libn/fp

Functional result handling.

```sh
deno add jsr:@libn/fp

npx jsr add @libn/fp
npm install @libn/fp

bunx jsr add @libn/fp
bun add @libn/fp
```

- [Rust std::result](https://doc.rust-lang.org/std/result/#the-question-mark-operator-)
- [Purifree](https://github.com/nythrox/purifree)

## default

```ts
import { exec, some } from "@libn/fp";
import { assertEquals } from "@std/assert";

const ok = false;
assertEquals(
  exec(function* ($) {
    return yield* some($);
  })(ok).state,
  ok,
);
```
