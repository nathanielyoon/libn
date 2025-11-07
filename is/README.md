# @libn/is

Test types.

```sh
deno add jsr:@libn/is

npx jsr add @libn/is
npm install @libn/is

bunx jsr add @libn/is
bun add @libn/is
```

- [Typescript #17002](https://github.com/microsoft/TypeScript/issues/17002)
- [Typescript #44253](https://github.com/microsoft/TypeScript/issues/44253)
- [Typescript #20863](https://github.com/microsoft/TypeScript/issues/20863)

## default

```ts
import { type Is, is } from "@libn/is";
import { assertEquals } from "@std/assert";

// Test types directly
is<Is<[0] & [0], [0] | [0]>>(true);

// Test types of values
assertEquals(is<0>()(0), 0);
// @ts-expect-error wrong!
is(1)(0);
```

```ts
import { hasOwn, isArray, isObject } from "@libn/is";
import { assertEquals } from "@std/assert";

// Check arrays
const immutable: 0 | readonly 0[] = [];
if (isArray(immutable)) immutable; // type is `readonly 0[]`

// Check if something is a non-null, non-array object
assertEquals(isObject(0), false);
assertEquals(isObject(null), false);
assertEquals(isObject([]), false);
assertEquals(isObject({}), true);

// Check key presence
const ab: { a: 0 } | { b: 0 } = { a: 0 };
if (hasOwn(ab, "a")) ab.a; // ok (correct)

// Be careful
const abc: { a: 0 } | { b: 0; c: 0 } = { a: 0, b: 0 };
if (hasOwn(abc, "b")) abc.c; // ok (incorrect)
```
