const IN = /["&<>]/g;
const OUT = Array<string>(63).fill("");
OUT[34] = "&quot;", OUT[38] = "&amp;", OUT[60] = "&lt;", OUT[62] = "&gt;";
/** Escapes a string. */
export const escape = ($: string): string => {
  if (!IN.test($)) return $;
  let b = "", c = 0;
  do b += $.slice(c, c = IN.lastIndex - 1) +
    OUT[$.charCodeAt(c++)]; while (IN.test($));
  return b + $.slice(c);
};
/** Escapes a HTML template. */
export const html = ($: { raw: readonly string[] }, ...use: any[]): string => {
  let a = "";
  for (let b, c, d, z = 0; z < use.length; ++z) {
    b = $.raw[z], c = use[z] ?? "";
    d = typeof c === "string" ? c : Array.isArray(c) ? c.join("") : `${c}`;
    a += b.charCodeAt(b.length - 1) === 36 ? b.slice(0, -1) + d : b + escape(d);
  }
  return (a + $.raw[use.length]).replace(/^\s*\r?\n/gm, "");
};
