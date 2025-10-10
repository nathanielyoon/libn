import type { CsvOptions, Row } from "./lib.ts";

const enum Code {
  LF = 10, // \n
  CR = 13, // \r
  QT = 34, // "
  CM = 44, // ,
}
const enum Part { // outside UTF-16 range
  BEFORE = 1 << 16,
  INSIDE = 1 << 17,
  FINISH = 1 << 18,
}
const enum Case {
  LF_BEFORE = Code.LF | Part.BEFORE,
  LF_INSIDE = Code.LF | Part.INSIDE,
  LF_FINISH = Code.LF | Part.FINISH,
  CR_BEFORE = Code.CR | Part.BEFORE,
  CR_INSIDE = Code.CR | Part.INSIDE,
  CR_FINISH = Code.CR | Part.FINISH,
  QT_BEFORE = Code.QT | Part.BEFORE,
  QT_INSIDE = Code.QT | Part.INSIDE,
  QT_FINISH = Code.QT | Part.FINISH,
  CM_BEFORE = Code.CM | Part.BEFORE,
  CM_INSIDE = Code.CM | Part.INSIDE,
  CM_FINISH = Code.CM | Part.FINISH,
}
/** Decodes CSV to an array of rows. */
export const decodeCsv = <A extends {} | null = null>(
  $: string,
  options?: CsvOptions<A>,
): Row<A>[] | null => {
  if ($.charCodeAt(0) === 0xfeff) $ = $.slice(1);
  if (!$.length) return [];
  const at = $.charCodeAt.bind($), eol = ~$.indexOf("\r") ? "\r\n" : "\n";
  const eager = options?.eager ?? true, nil = options?.empty?.value ?? null;
  const rows = [];
  let row = [], size = 0, part = Part.BEFORE, raw = false, fix = false, temp;
  let z = 0, y = 0, x = 0, w;
  do top: switch (at(z) | part) {
    case Case.LF_BEFORE:
    case Case.CR_BEFORE:
      y || rows.push(row = Array(size)), row[y++] = nil, size ||= y, y = 0;
      at(z) === Code.CR && at(z + 1) === Code.LF && ++z;
      break;
    case Case.LF_INSIDE:
    case Case.CR_INSIDE:
      if (!raw) break;
      y || rows.push(row = Array(size)), row[y++] = $.slice(x, z);
      fix = raw = false; // falls through
    case Case.LF_FINISH:
    case Case.CR_FINISH:
      size ||= y, y = 0, at(z) === Code.CR && at(z + 1) === Code.LF && ++z;
      part = Part.BEFORE;
      break;
    case Case.QT_BEFORE:
      if (eager && size) {
        for (w = z; w = $.indexOf('"', w + 1) + 1; fix = true) {
          if (at(w) !== Code.QT) {
            temp = $.slice(z + 1, z = w - 1), y || rows.push(row = Array(size));
            row[y] = fix ? temp.replaceAll('""', '"') : temp;
            ++y === size && (y = 0), part = Part.FINISH, fix = raw = false;
            break top;
          }
        }
        return null;
      }
      x = z + 1, part = Part.INSIDE, fix = raw = false;
      break;
    case Case.QT_INSIDE:
      if (raw) return null;
      if (at(z + 1) !== Code.QT) {
        temp = $.slice(x, z), y || rows.push(row = Array(size));
        row[y++] = fix ? temp.replaceAll('""', '"') : temp, part = Part.FINISH;
      } else ++z, fix = true;
      break;
    case Case.QT_FINISH:
      return null;
    case Case.CM_BEFORE:
      y || rows.push(row = Array(size)), row[y++] = nil;
      break;
    case Case.CM_INSIDE:
      if (!raw) break;
      y || rows.push(row = Array(size)), row[y++] = $.slice(x, z);
      raw = false; // falls through
    case Case.CM_FINISH:
      part = Part.BEFORE;
      break;
    default:
      if (part === Part.BEFORE) {
        if (eager && size) {
          w = $.indexOf(temp = y === size - 1 ? eol : ",", z + 1);
          if (~w) {
            y || rows.push(row = Array(size)), row[y] = $.slice(z, w);
            ++y === size && (y = 0), z = w + temp.length - 1;
            part = Part.BEFORE, raw = false;
            break;
          }
        }
        x = z, part = Part.INSIDE, raw = true;
      }
  } while (++z < $.length);
  if (part === Part.INSIDE) {
    if (!raw) return null;
    y || rows.push(row = Array(size)), row[y] = $.slice(x);
  }
  return rows;
};
