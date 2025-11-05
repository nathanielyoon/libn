# @libn/signal

Reactive state.

```sh
deno add jsr:@libn/signal

npx jsr add @libn/signal
npm install @libn/signal

bunx jsr add @libn/signal
bun add @libn/signal
```

- [alien-signals](https://github.com/stackblitz/alien-signals)
- [Reactivity](https://milomg.dev/2022-12-01/reactivity)

## default

```ts
import { derive, effect, signal } from "@libn/signal";
import { assertEquals } from "@std/assert";

// Initialize some state
const count = signal(0);
const half = derive(() => count() >> 1);

// Attach side-effects, which run immediately
let called = 0;
effect(() => {
  half();
  ++called;
});
assertEquals(called, 1);

// Graph updates propagate when changed
count(1);
assertEquals(called, 1);
count(2);
assertEquals(called, 2);
```
