# @libn/json

JSON schema types and checks.

## schema

Types for a subset of [Draft 2020-12](https://json-schema.org/draft/2020-12).

```ts
import type { Instance, Schema } from "@libn/json/schema";
import { assertEquals } from "@std/assert";

const schema = {
  type: "object",
  properties: {
    small: { oneOf: [{ type: "null" }, { enum: [0, 1, 2] }] },
    large: { type: "string", maxLength: 65535 },
    array: { type: "array", items: { type: "boolean" } },
  },
  additionalProperties: false,
  required: ["small", "array"],
} satisfies Schema;

const instance = {
  small: null,
  array: [false, true],
} satisfies Instance<typeof schema>;
```

## check

Parse to valid data or error [pointers](https://www.rfc-editor.org/rfc/rfc6901).

```ts
import { compile, is, point, to } from "@libn/json/check";
import { Err } from "@libn/result";
import { assert, assertEquals } from "@std/assert";

const schema = {
  type: "array",
  items: { type: "number", multipleOf: 2 },
} as const;
const check = compile(schema);

// Fast-path type predicate
assertEquals(is(check, [4, 24]), true);

// Parse a deep copy or an array of error pointers
const instance = [0, true];
const result = to(check, instance);
assert(!result.state);
assertEquals(result.cause, [{
  type: "/items/type", // path to failed constraint
  data: "/1", // path to invalid value
}]);
assertEquals(point(schema, result.cause[0].type), "number"); // expected number
assertEquals(point(instance, result.cause[0].data), true); // but got this
```
