# @libn/csv

Comma-separated values.

## parse

[Parse](https://github.com/fabiospampinato/csv-simple-parser)
[RFC 4180](https://www.rfc-editor.org/rfc/rfc4180) CSV.

```ts
import { deCsv } from "@libn/csv/parse";
import { assertEquals } from "@std/assert";

assertEquals(
  deCsv("aaa,bbb,ccc\nzzz,yyy,xxx\n"),
  { error: null, value: [["aaa", "bbb", "ccc"], ["zzz", "yyy", "xxx"]] },
);
```

## stringify

Stringify [RFC 4180](https://www.rfc-editor.org/rfc/rfc4180) CSV.

```ts
import { enCsv } from "@libn/csv/stringify";
import { assertEquals } from "@std/assert";

assertEquals(
  enCsv([["aaa", "bbb", "ccc"], ["zzz", "yyy", "xxx"]]),
  "aaa,bbb,ccc\nzzz,yyy,xxx\n",
);
```
