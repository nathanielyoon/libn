/** Parses CSV. */
export const de_csv = ($: string): (string | null)[][] | null => {
  if ($.charCodeAt(0) === 0xfeff) $ = $.slice(1);
  const a = /(?:("?)([^\n\r",]+)\1|"((?:[^"]|"")*)"|)(,|\r?\n|(?:\r?\n)?$)/y;
  for (let b = [], c = [], d; d = a.exec($);) {
    if (c.push(d[2] ?? d[3]?.replaceAll('""', '"') ?? null), d[4] !== ",") {
      if (b.push(c), c = [], a.lastIndex === $.length) return b;
    }
  }
  return null;
};
/** Stringifies CSV. */
export const en_csv = ($: (string | null)[][]): string => {
  let a = "";
  for (let b, c, d, z = 0, y; z < $.length; a += c.replace(/,?$/, "\n"), ++z) {
    for (b = $[z], c = "", y = 0; y < b.length; ++y) {
      if ((d = b[y]) === null) c += ",";
      else if (/^[^\n\r",]+$/.test(d)) c += d + ",";
      else c += `"${d.replaceAll('"', '""')}",`;
    }
  }
  return a;
};
