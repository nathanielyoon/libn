# @libn/is

Test types.

```sh
deno add jsr:@libn/is

npx jsr add @libn/is
npm install @libn/is

bunx jsr add @libn/is
bun add @libn/is
```

## default

```ts
import { type Is, is } from "@libn/is";

// Test types directly
is<Is<[0] & [0], [0] | [0]>>(true);

// Test types of values
is<0>()(0);
// @ts-expect-error wrong!
is(1)(0);
```
