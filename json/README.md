# @libn/json

JSON Schema building and checking, along with type and JSON pointer utilities.

```sh
deno add jsr:@libn/json

npx jsr add @libn/json
npm install @libn/json

bunx jsr add @libn/json
bun add @libn/json
```

- [RFC 6901](https://www.rfc-editor.org/rfc/rfc6901)
- [Draft 2020-12](https://json-schema.org/draft/2020-12)

## lib

```ts
import { isArray, type } from "@libn/json/lib";
import { assertEquals } from "@std/assert";

for (const $ of [0, []] as const) {
  if (isArray($)) assertEquals(type<readonly []>()($), []);
  else assertEquals(type<0>()($), 0);
}
```

## pointer

```ts
import { dereference } from "@libn/json/pointer";
import { assertEquals } from "@std/assert";

// Resolve valid JSON pointers
assertEquals(dereference({ a: [{ b: [0, 1] }] }, "/a/0/b/1"), 1);

// Invalid pointers or missing keys/indices resolve to `undefined`
assertEquals(dereference({ a: 0 }, "a"), undefined);
assertEquals(dereference({ a: 0 }, "/b"), undefined);
```

## schema

```ts
import { type } from "@libn/json/lib";
import type { Instance, Int, Schema } from "@libn/json/schema";

// Only accepts a minimal subset of schemas
const integerSchema = {
  type: "integer",
  // @ts-expect-error
  enum: [],
  // @ts-expect-error
  const: "4",
} satisfies Int;

// Infer instance type from a valid schema
const schema = {
  type: "array",
  prefixItems: [
    { type: "boolean", const: false },
    { type: "number", enum: [1, 2] },
  ],
  items: false,
  minItems: 1,
} as const satisfies Schema;
const pass = [false] satisfies Instance<typeof schema>;
const fail = [
  // @ts-expect-error
  true,
  // @ts-expect-error
  3,
] satisfies Instance<typeof schema>;
```

## build

```ts
import { arr, bit, int, nil, num, obj, str } from "@libn/json/build";
import { assertEquals } from "@std/assert";

// Use builders
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

// Expands to a fully-compatible JSON schema
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

```ts
import { assert, compile, is, parse } from "@libn/json/check";
import { assertEquals, assertThrows } from "@std/assert";

// Create a validator
const check = compile({
  type: "array",
  items: { type: "integer", enum: [2, 4, 6] },
});

// Pass to a wrapper
assertEquals(parse(check, [true]), { state: false, value: ["/items/type~/0"] });
assertEquals(is(check, [4, 4]), true);
assertThrows(() => assert(check, [1]));
```
