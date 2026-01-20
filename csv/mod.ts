/** @module */
import type { Result } from "@libn/result";

/** Any (defined) primitive. */
export type Value = null | boolean | number | bigint | string;
/** Options for CSV parsing and stringifying. */
export interface CsvOptions<A extends Value> {
  /** Whether to parse assuming all rows are the same length. @default true */
  eager?: boolean;
  /** Value of empty fields (between adjacent delimiters/EOLs). @default null */
  empty?: A;
  /** Line ending, set to `""` to infer when parsing. @default '\n' */
  eol?: string;
}
/** Errors with the invalid field's inclusive-start exclusive-end range. */
export type ParseError = {
  /** Field has an opening quote, but the input ends without a closing one. */
  UnclosedQuote: readonly [number, number];
  /** Field has no opening quote, but has a quote character later on. */
  LoneQuote: readonly [number, number];
  /** Field's closing quote isn't followed by a comma, line break, or EOF. */
  EarlyClose: readonly [number, number];
};
type Flag = 0x10000 | 0x20000 | 0x40000; // before/inside/finish field
const range = (start: number, csv: string) => {
  const END = /[\r\n,]/g;
  return [END.lastIndex = start, END.exec(csv)?.index ?? csv.length] as const;
};
/** Converts a CSV string to an array of rows (or an error). */
export const deCsv = <A extends Value = null>(
  csv: string,
  options?: CsvOptions<A>,
): Result<(string | A)[][], ParseError> => {
  if (!csv.length) return { error: null, value: [] };
  const eol = (options?.eol ?? "\n") || (~csv.indexOf("\r") ? "\r\n" : "\n");
  const empty = options?.empty ?? null, eager = options?.eager ?? true;
  const rows = [];
  let row = [], size = 0, flag: Flag = 0x10000, raw = false, fix = false, on;
  let z = 0, y = 0, x = 0, w;
  do top: switch (csv.charCodeAt(z) | flag) {
    case 0x1_000a:
    case 0x1_000d:
      y || rows.push(row = []), row[y++] = empty, size ||= y, y = 0;
      csv.charCodeAt(z) === 0x0d && csv.charCodeAt(z + 1) === 0x0a && ++z;
      break;
    case 0x2_000a:
    case 0x2_000d:
      if (!raw) break;
      y || rows.push(row = []), row[y++] = csv.slice(x, z), fix = raw = false;
    // falls through
    case 0x4_000a:
    case 0x4_000d:
      flag = 0x10000, size ||= y, y = 0;
      csv.charCodeAt(z) === 0x0d && csv.charCodeAt(z + 1) === 0x0a && ++z;
      break;
    case 0x1_0022:
      if (eager && size) {
        for (w = z, fix = false; w = csv.indexOf('"', w + 1) + 1; fix = true) {
          if (csv.charCodeAt(w) !== 0x22) {
            on = csv.slice(z + 1, z = w - 1), y || rows.push(row = Array(size));
            row[y] = fix ? on.replaceAll('""', '"') : on, flag = 0x40000;
            ++y === size && (y = 0), fix = raw = false;
            break top;
          }
        }
        return { error: "UnclosedQuote", value: range(z, csv) };
      } else x = z + 1, flag = 0x20000, raw = false, fix = false;
      break;
    case 0x2_0022:
      if (raw) return { error: "LoneQuote", value: range(x, csv) };
      if (csv.charCodeAt(z + 1) !== 0x22) {
        on = csv.slice(x, z), y || rows.push(row = []);
        row[y++] = fix ? on.replaceAll('""', '"') : on, flag = 0x40000;
        // No need to reset `raw` status here, other end-of-field states will.
      } else ++z, fix = true;
      break;
    case 0x1_002c:
      y || rows.push(row = []), row[y++] = empty;
      break;
    case 0x2_002c:
      if (!raw) break;
      y || rows.push(row = []), row[y++] = csv.slice(x, z), raw = false;
    // falls through
    case 0x4_002c:
      flag = 0x10000;
      break;
    default:
      switch (flag) {
        case 0x1_0000:
          if (
            eager && size &&
            ~(w = csv.indexOf(on = y === size - 1 ? eol : ",", z + 1))
          ) {
            // This branch doesn't detect quotes within the (unquoted) field.
            // To do so, set the `this.eager` option to `false`.
            y || rows.push(row = Array(size)), row[y] = csv.slice(z, w);
            ++y === size && (y = 0), z = w + on.length - 1;
            flag = 0x10000, raw = false;
          } else x = z, flag = 0x20000, raw = true;
          break;
        case 0x4_0000:
          return { error: "EarlyClose", value: range(z, csv) };
      }
  } while (++z < csv.length);
  if (flag === 0x20000) {
    if (!raw) return { error: "UnclosedQuote", value: [x - 1, csv.length] };
    y || rows.push(row = []), row[y] = csv.slice(x);
  }
  return { error: null, value: rows };
};
/** Converts an array of rows to a CSV string. */
export const enCsv = <A extends Value = null>(
  rows: (string | A)[][],
  options?: CsvOptions<A>,
): string => {
  const empty = options?.empty ?? null, eol = options?.eol || "\n";
  let csv = "";
  for (let row, line, z = 0, y = 0; z < rows.length; ++z) {
    for (row = rows[z], line = "", y = 0; y < row.length; ++y) {
      const field = row[y];
      if (field === empty) line += ",";
      else if (/^[^\n\r",]+$/.test(field as string)) line += field + ",";
      else line += `"${(field as string).replaceAll('"', '""')}",`;
    }
    csv += line.slice(0, -1) + eol;
  }
  return csv;
};
