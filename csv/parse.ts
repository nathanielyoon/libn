/** @module */

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
type Flag = 0x10000 | 0x20000 | 0x40000; // before/inside/finish field
/** Decodes CSV to an array of rows. */
export const deCsv = <A = null>(
  $: string,
  options: ParseOptions<A> = {},
): (string | A)[][] | null => {
  if ($.charCodeAt(0) === 0xfeff) $ = $.slice(1);
  if (!$.length) return [];
  const eol = ~$.indexOf("\r") ? "\r\n" : "\n", eager = options.eager ?? true;
  const nil = Object.hasOwn(options, "empty") ? options.empty : null, rows = [];
  let row = [], size = 0, flag: Flag = 0x10000, raw = false, fix = false, temp;
  let z = 0, y = 0, x = 0, w;
  do top: switch ($.charCodeAt(z) | flag) {
    case 0x1000a:
    case 0x1000d:
      y || rows.push(row = Array(size)), row[y++] = nil, size ||= y, y = 0;
      $.charCodeAt(z) === 0x0d && $.charCodeAt(z + 1) === 0x0a && ++z;
      break;
    case 0x2000a:
    case 0x2000d:
      if (!raw) break;
      y || rows.push(row = Array(size)), row[y++] = $.slice(x, z);
      fix = raw = false; // falls through
    case 0x4000a:
    case 0x4000d:
      flag = 0x10000, size ||= y, y = 0;
      $.charCodeAt(z) === 0x0d && $.charCodeAt(z + 1) === 0x0a && ++z;
      break;
    case 0x10022:
      if (eager && size) {
        for (w = z; w = $.indexOf('"', w + 1) + 1; fix = true) {
          if ($.charCodeAt(w) !== 0x22) {
            temp = $.slice(z + 1, z = w - 1), y || rows.push(row = Array(size));
            row[y] = fix ? temp.replaceAll('""', '"') : temp;
            flag = 0x40000, ++y === size && (y = 0), fix = raw = false;
            break top;
          }
        }
        return null;
      }
      x = z + 1, flag = 0x20000, fix = raw = false;
      break;
    case 0x20022:
      if (raw) return null;
      if ($.charCodeAt(z + 1) !== 0x22) {
        temp = $.slice(x, z), y || rows.push(row = Array(size));
        row[y++] = fix ? temp.replaceAll('""', '"') : temp, flag = 0x40000;
      } else ++z, fix = true;
      break;
    case 0x40022:
      return null;
    case 0x1002c:
      y || rows.push(row = Array(size)), row[y++] = nil;
      break;
    case 0x2002c:
      if (!raw) break;
      y || rows.push(row = Array(size)), row[y++] = $.slice(x, z);
      raw = false; // falls through
    case 0x4002c:
      flag = 0x10000;
      break;
    default:
      if (flag === 0x10000) {
        if (eager && size) {
          w = $.indexOf(temp = y === size - 1 ? eol : ",", z + 1);
          if (~w) {
            y || rows.push(row = Array(size)), row[y] = $.slice(z, w);
            ++y === size && (y = 0), z = w + temp.length - 1;
            flag = 0x10000, raw = false;
            break;
          }
        }
        x = z, flag = 0x20000, raw = true;
      }
  } while (++z < $.length);
  if (flag === 0x20000) {
    if (!raw) return null;
    y || rows.push(row = Array(size)), row[y] = $.slice(x);
  }
  return rows;
};
