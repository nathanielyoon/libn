# @libn/signal

Reactive state.

## default

System derived from
[alien-signals](https://github.com/stackblitz/alien-signals).

```ts
import { derive, effect, signal } from "@libn/signal";
import { assertEquals } from "@std/assert";

const count = signal(0);
const half = derive(() => count() >> 1);

let called = 0;
effect(() => {
  half();
  ++called;
});
assertEquals(called, 1);
count(1);
assertEquals(called, 1);
count(2);
assertEquals(called, 2);
```
