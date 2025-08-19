import { assertEquals } from "jsr:@std/assert@^1.0.14";
import fc from "npm:fast-check@^4.2.0";
import { fc_string } from "../../test.ts";
import { de_header, en_header } from "../header.ts";

const _en_header = (rows: { [_: string]: unknown }[], header: string[]) => {
  const a = Array(rows.length);
  for (let z = 0, y, b = header.length, c, d; z < rows.length; ++z) {
    for (y = 0, c = rows[z], d = a[z] = Array(b); y < b; ++y) {
      d[y] = c[header[y]];
    }
  }
  return a.unshift(header), a;
};
const _de_header = (header: string[], rows: unknown[][]) => {
  const a = Array(rows.length);
  for (let z = 0, y, b = header.length, c, d; z < rows.length; ++z) {
    for (y = 0, c = rows[z], d = a[z] = {} as any; y < b; ++y) {
      d[header[y]] = c[y];
    }
  }
  return a;
};
Deno.test("header", () => {
  fc.assert(fc.property(
    fc.array(fc.dictionary(fc_string(), fc.jsonValue())),
    (rows) =>
      assertEquals(
        en_header(rows),
        rows.length ? _en_header(rows, Object.keys(rows[0])) : [],
      ),
  ));
  fc.assert(fc.property(
    fc.uniqueArray(fc_string()).chain(($) =>
      fc.tuple(
        fc.array(fc.record(
          $.reduce((all, key) => ({ ...all, [key]: fc.jsonValue() }), {}),
        )),
        fc.constant($),
      )
    ),
    ([rows, header]) =>
      assertEquals(
        en_header(rows, header),
        rows.length || header.length ? _en_header(rows, header) : [],
      ),
  ));
  fc.assert(fc.property(
    fc.uniqueArray(fc_string()),
    fc.array(fc.array(fc.jsonValue())),
    (header, rows) =>
      assertEquals(de_header([header, ...rows]), _de_header(header, rows)),
  ));
});
