/** @module */
import type { Result } from "@libn/result";

/** Parse options. */
export interface ParseOptions<A> {
  /**
   * Whether to assume all rows are the same length.
   *
   * @default true
   */
  eager?: boolean;
  /**
   * Value for empty fields (between adjacent delimiters/line endings).
   *
   * @default null
   */
  empty?: A;
}
/** Errors with the invalid field's inclusive-start exclusive-end range. */
export type ParseError = {
  /** Field has an opening quote, but the input ends without a closing one. */
  UnclosedQuotedField: readonly [number, number];
  /** Field has no opening quote, but has a quote character later on. */
  QuoteInUnquotedField: readonly [number, number];
  /** Field's closing quote isn't followed by a comma, line break, or EOF. */
  NonSeparatorAfterClosingQuote: readonly [number, number];
};
const end = (start: number, $: string) => {
  const CLOSE = /[\r\n,]/g;
  return [CLOSE.lastIndex = start, CLOSE.exec($)?.index ?? $.length] as const;
};
type Flag = 0x1_0000 | 0x2_0000 | 0x4_0000; // before/inside/finish field
/** Decodes CSV to an array of rows. */
export const deCsv = <A = null>(
  $: string,
  options: ParseOptions<A> = {},
): Result<(string | A)[][], ParseError> => {
  if ($.charCodeAt(0) === 0xfeff) $ = $.slice(1);
  if (!$.length) return { error: null, value: [] };
  const eol = ~$.indexOf("\r") ? "\r\n" : "\n", eager = options.eager ?? true;
  const nil = Object.hasOwn(options, "empty") ? options.empty : null, rows = [];
  let row = [], size = 0, flag: Flag = 0x10000, raw = false, fix = false, temp;
  let z = 0, y = 0, x = 0, w;
  do top: switch ($.charCodeAt(z) | flag) {
    case 0x1_000a:
    case 0x1_000d:
      y || rows.push(row = Array(size)), row[y++] = nil, size ||= y, y = 0;
      $.charCodeAt(z) === 0x0d && $.charCodeAt(z + 1) === 0x0a && ++z;
      break;
    case 0x2_000a:
    case 0x2_000d:
      if (!raw) break;
      y || rows.push(row = Array(size)), row[y++] = $.slice(x, z);
      fix = raw = false;
    // falls through
    case 0x4_000a:
    case 0x4_000d:
      flag = 0x10000, size ||= y, y = 0;
      $.charCodeAt(z) === 0x0d && $.charCodeAt(z + 1) === 0x0a && ++z;
      break;
    case 0x1_0022:
      if (eager && size) {
        for (w = z, fix = false; w = $.indexOf('"', w + 1) + 1; fix = true) {
          if ($.charCodeAt(w) !== 0x22) {
            temp = $.slice(z + 1, z = w - 1), y || rows.push(row = Array(size));
            row[y] = fix ? temp.replaceAll('""', '"') : temp;
            flag = 0x40000, ++y === size && (y = 0), fix = raw = false;
            break top;
          }
        }
        return { error: "UnclosedQuotedField", value: end(z, $) };
      } else x = z + 1, flag = 0x20000, fix = raw = false;
      break;
    case 0x2_0022:
      if (raw) return { error: "QuoteInUnquotedField", value: end(x, $) };
      if ($.charCodeAt(z + 1) !== 0x22) {
        temp = $.slice(x, z), y || rows.push(row = Array(size));
        row[y++] = fix ? temp.replaceAll('""', '"') : temp, flag = 0x40000;
        // No need to reset `raw` status here, other end-of-field states will.
      } else ++z, fix = true;
      break;
    case 0x1_002c:
      y || rows.push(row = Array(size)), row[y++] = nil;
      break;
    case 0x2_002c:
      if (!raw) break;
      y || rows.push(row = Array(size)), row[y++] = $.slice(x, z), raw = false;
    // falls through
    case 0x4_002c:
      flag = 0x10000;
      break;
    default:
      switch (flag) {
        case 0x1_0000:
          if (
            eager && size &&
            ~(w = $.indexOf(temp = y === size - 1 ? eol : ",", z + 1))
          ) {
            // This branch doesn't detect quotes within the (unquoted) field. To
            // do so, set the `eager` option to `false`.
            y || rows.push(row = Array(size)), row[y] = $.slice(z, w);
            ++y === size && (y = 0), z = w + temp.length - 1;
            flag = 0x10000, raw = false;
          } else x = z, flag = 0x20000, raw = true;
          break;
        case 0x4_0000:
          return { error: "NonSeparatorAfterClosingQuote", value: end(z, $) };
      }
  } while (++z < $.length);
  if (flag === 0x20000) {
    if (!raw) return { error: "UnclosedQuotedField", value: [x - 1, $.length] };
    y || rows.push(row = Array(size)), row[y] = $.slice(x);
  }
  return { error: null, value: rows };
};
