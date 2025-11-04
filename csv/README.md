# @libn/csv

Parsing and stringifying comma-separated values.

```sh
deno add jsr:@libn/csv

npx jsr add @libn/csv
npm install @libn/csv

bunx jsr add @libn/csv
bun add @libn/csv
```

- [RFC 4180](https://www.rfc-editor.org/rfc/rfc4180)
- [csv-simple-parser](https://github.com/fabiospampinato/csv-simple-parser)

## parse

```ts
import { deCsv } from "@libn/csv/parse";
import { assertEquals } from "@std/assert";

assertEquals(
  deCsv("aaa,bbb,ccc\nzzz,yyy,xxx\n"),
  [["aaa", "bbb", "ccc"], ["zzz", "yyy", "xxx"]],
);
```

## stringify

```ts
import { enCsv } from "@libn/csv/stringify";
import { assertEquals } from "@std/assert";

assertEquals(
  enCsv([["aaa", "bbb", "ccc"], ["zzz", "yyy", "xxx"]]),
  "aaa,bbb,ccc\nzzz,yyy,xxx\n",
);
```
