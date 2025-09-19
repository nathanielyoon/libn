import type { Options, Row } from "./common.ts";

/** Encodes array of rows -> CSV string. */
export const en_csv = (($: Row<any>[], options?: Options<any>) => {
  const is_empty = options?.empty?.check ?? (($) => $ === null);
  let csv = "", row, line, field;
  for (let z = 0, y; z < $.length; csv += line.replace(/,?$/, "\n"), ++z) {
    for (row = $[z], line = "", y = 0; y < row.length; ++y) {
      if (is_empty(field = row[y])) line += ",";
      else if (/^[^\n\r",]+$/.test(field!)) line += field + ",";
      else line += `"${field!.replaceAll('"', '""')}",`;
    }
  }
  return csv;
}) as {
  ($: Row<null>[], options?: Options<null>): string;
  <A extends {}>(
    $: Row<A>[],
    options: Options<A> & { empty: { check: {} } },
  ): string;
};
