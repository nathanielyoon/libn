# @libn/lib

Internal utilities, mostly for testing.

```sh
deno add jsr:@libn/lib

npx jsr add @libn/lib
npm install @libn/lib

bunx jsr add @libn/lib
bun add @libn/lib
```

## is

```ts
import { type Is, type } from "@libn/lib/is";

// Test types directly
type<Is<[0] & [0], [0] | [0]>>(true);

// Test types of values
type<0>()(0);
// @ts-expect-error wrong!
type(1)(0);
```

## fc

```ts
import { fcBinary } from "@libn/lib/fc";
import { assertEquals, assertNotEquals } from "@std/assert";
import fc from "fast-check";

// Get `Uint8Array`s of a specific length
fc.assert(fc.property(fcBinary(32), ($) => {
  assertEquals($.length, 32);
}));

// Get `Uint8Array`s of any other length
fc.assert(fc.property(fcBinary(-32), ($) => {
  assertNotEquals($.length, 32);
}));
```

## process

```ts
import { run } from "@libn/lib/process";
import { open } from "@libn/result";
import { assertEquals } from "@std/assert";

// Execute simple commands
assertEquals(
  new TextDecoder().decode(open(await run("deno", ["-v"]))),
  `deno ${Deno.version.deno}\n`,
);
```

```ts ignore
import { spawn } from "@libn/lib/process";
import { open } from "@libn/result";

// Refactor [this](https://docs.deno.com/examples/subprocesses_spawn/):
const command = new Deno.Command("deno", {
  args: ["fmt", "-"],
  stdin: "piped",
  stdout: "piped",
});

const process = command.spawn();

const writer = process.stdin.getWriter();
await writer.write(new TextEncoder().encode("console.log('hello')"));
writer.releaseLock();

await process.stdin.close();

const stdout = await process.stdout.text();
console.log(stdout);

await process.status;

// To this:
console.log(new TextDecoder().decode(open(
  await spawn("deno", new TextEncoder().encode("console.log('hello')"), {
    args: ["fmt", "-"],
  }),
)));
```
