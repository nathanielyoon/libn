/** @module stringify */

/** Encodes an array of rows to CSV. */
export const enCsv = (($: any[][], check?: ($: unknown) => boolean) => {
  check ??= ($) => $ === null;
  let csv = "", row, line, field;
  for (let z = 0, y; z < $.length; csv += line.replace(/,?$/, "\n"), ++z) {
    for (row = $[z], line = "", y = 0; y < row.length; ++y) {
      if (check(field = row[y])) line += ",";
      else if (/^[^\n\r",]+$/.test(field)) line += field + ",";
      else line += `"${field.replaceAll('"', '""')}",`;
    }
  }
  return csv;
}) as {
  ($: (string | null)[][]): string;
  <A>($: (string | A)[][], check: ($: string | A) => $ is A): string;
};
