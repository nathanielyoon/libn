import type { CsvOptions, Row } from "./lib.ts";

/** Encodes an array of rows to CSV. */
export const enCsv = (($: Row<any>[], options?: CsvOptions<any>) => {
  const isEmpty = options?.empty?.check ?? (($) => $ === null);
  let csv = "", row, line, field;
  for (let z = 0, y; z < $.length; csv += line.replace(/,?$/, "\n"), ++z) {
    for (row = $[z], line = "", y = 0; y < row.length; ++y) {
      if (isEmpty(field = row[y])) line += ",";
      else if (/^[^\n\r",]+$/.test(field!)) line += field + ",";
      else line += `"${field!.replaceAll('"', '""')}",`;
    }
  }
  return csv;
}) as {
  ($: readonly Row<null>[], options?: CsvOptions<null>): string;
  <A extends {} | null>(
    $: readonly Row<A>[],
    options: CsvOptions<A> & { empty: { check: {} } },
  ): string;
};
