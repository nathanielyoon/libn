const OUT = Array<string>(63).fill("");
OUT[34] = "&quot;", OUT[38] = "&amp;", OUT[60] = "&lt;", OUT[62] = "&gt;";
/** Escapes a string. */
export const escape = ($: string): string => {
  const a = /["&<>]/g;
  let b = "", c = 0;
  while (a.test($)) b += $.slice(c, c = ~-a.lastIndex) + OUT[$.charCodeAt(c++)];
  return b + $.slice(c);
};
/** Escapes a HTML template. */
export const html = ({ raw }: TemplateStringsArray, ...$: any[]): string => {
  let a = "";
  for (let b, c, d, z = 0; z < $.length; ++z) {
    b = raw[z], c = $[z] ?? "";
    d = typeof c === "string" ? c : Array.isArray(c) ? c.join("") : `${c}`;
    a += b.charCodeAt(b.length - 1) === 36 ? b.slice(1) + d : b + escape(d);
  }
  return a + raw[$.length];
};
