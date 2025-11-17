# @libn/types

Utility types and tests.

## default

Compose and compare types.

```ts
import { type Is, type Json, type Tuple, type } from "@libn/types";

const object = { a: null, b: null } satisfies Json;
type<Is<Tuple<keyof typeof object>, ["a", "b"]>>(true);
```
