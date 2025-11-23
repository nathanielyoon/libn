# @libn/json

JSON Schema building and checking, with JSON pointer errors.

## schema

Types and builders for a subset of
[Draft 2020-12](https://json-schema.org/draft/2020-12).

```ts
import { arr, bit, int, nil, num, obj, str } from "@libn/json/schema";
import { assertEquals } from "@std/assert";

const schema = obj("tag", {
  tuple: obj({
    nullable: nil(bit()),
    arr: arr([
      obj({ const: int(0) }),
      obj({ enum: num([0.1, 0.2, 0.30000000000000004]) }),
    ], { minItems: 1 }),
  }),
  array: obj({
    null: nil(),
    arr: arr(obj(str({ format: "date-time" })), { maxItems: 3 }),
  }, { required: ["arr"] }),
});

// Every builder returns the schema as a plain object
assertEquals(schema, {
  type: "object",
  required: ["tag"],
  oneOf: [{
    type: "object",
    properties: {
      tag: { type: "string", const: "tuple" },
      nullable: {
        type: ["null", "boolean"],
        oneOf: [{ type: "null" }, { type: "boolean" }],
      },
      arr: {
        type: "array",
        prefixItems: [{
          type: "object",
          properties: {
            const: { type: "integer", const: 0 },
          },
          additionalProperties: false,
          required: ["const"],
        }, {
          type: "object",
          properties: {
            enum: { type: "number", enum: [0.1, 0.2, 0.30000000000000004] },
          },
          additionalProperties: false,
          required: ["enum"],
        }],
        items: false,
        minItems: 1,
      },
    },
    additionalProperties: false,
    required: ["nullable", "arr"],
  }, {
    type: "object",
    properties: {
      tag: { type: "string", const: "array" },
      null: { type: "null" },
      arr: {
        type: "array",
        items: {
          type: "object",
          additionalProperties: { type: "string", format: "date-time" },
        },
        maxItems: 3,
      },
    },
    additionalProperties: false,
    required: ["arr"],
  }],
});
```

## check

Parse to valid data or error [pointers](https://www.rfc-editor.org/rfc/rfc6901).

```ts
import { assert, compile, is, parse } from "@libn/json/check";
import { assertEquals, assertThrows } from "@std/assert";

const check = compile({
  type: "array",
  items: { type: "integer", enum: [2, 4, 6] },
});
// Parse a deep copy or an array of error pointers
assertEquals(parse(check, [true]), { state: false, value: ["/items/type~/0"] });
// Fast type predicate
assertEquals(is(check, [4, 4]), true);
```
