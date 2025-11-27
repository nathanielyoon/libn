# @libn/json

JSON schema types, builders, and validators.

## schema

Subset of [Draft 2020-12](https://json-schema.org/draft/2020-12).

```ts
import { arr, bit, nil, num, obj, opt, str } from "@libn/json/schema";
import { assertEquals } from "@std/assert";

assertEquals(
  // Each function returns a regular object
  obj({
    boolean: bit(),
    integer: num({ multipleOf: 1 }),
    nullable: nil(opt([false, 0, ""])),
    datetimes: arr(str({ format: "date-time" }), { uniqueItems: true }),
  }),
  {
    type: "object",
    properties: {
      boolean: { type: "boolean" },
      integer: { type: "number", multipleOf: 1 },
      nullable: { oneOf: [{ type: "null" }, { enum: [false, 0, ""] }] },
      datetimes: {
        type: "array",
        items: { type: "string", format: "date-time" },
        uniqueItems: true,
      },
    },
    additionalProperties: false,
    // All properties are required unless specified otherwise
    required: ["boolean", "integer", "nullable", "datetimes"],
  },
);
```

## check

Validate, or parse to either valid data or error
[pointers](https://www.rfc-editor.org/rfc/rfc6901).

```ts
import { compile, is, point, to } from "@libn/json/check";
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
assert(result.error);
assertEquals(result.value, [{
  type: "/items/type", // path to failed constraint
  data: "/1", // path to invalid value
}]);
assertEquals(point(schema, result.value[0].type), "number"); // expected number
assertEquals(point(instance, result.value[0].data), true); // but got this
```
