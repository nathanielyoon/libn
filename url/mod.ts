import { en_bin } from "@nyoon/base";
import { hmac, sha256 } from "@nyoon/hash";

const hex = ($: string, byte: number) => $ + byte.toString(16).padStart(2, "0");
/** Presigns a URL for the specified path and operation. */
export const presign = (
  env: { S3_HOST: string; S3_ID: string; S3_KEY: string },
  path: string,
  method: "PUT" | "GET" | "HEAD" = "PUT",
  headers: { [header: string]: string } = {},
  time = 604800,
  region = "auto",
  date = new Date(),
) => {
  const a = date.toISOString().replace(/[-:]|\..../g, ""), b = a.slice(0, 8);
  const c = new URL(env.S3_HOST).hostname, d: typeof headers = { host: c };
  for (const $ in headers) d[$.toLowerCase()] = headers[$];
  const e = Object.keys(d).sort(), f = `${b}/${region}/s3/aws4_request`;
  const g = `X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${env.S3_ID}%2F${
    f.replace(/[^-.\w~]/g, ($) => hex("%", $.charCodeAt(0)).toUpperCase())
  }&X-Amz-Date=${a}&X-Amz-Expires=${time}&X-Amz-SignedHeaders=${e.join("%3B")}`;
  let h = `${method}\n/${path}\n${g}\n`, z = 0;
  do h += `${e[z]}:${d[e[z]]}\n`; while (++z < e.length);
  return `${c}/${path}?${g}&X-Amz-Signature=` + hmac(
    hmac(
      hmac(
        hmac(hmac(en_bin(`AWS4${env.S3_KEY}`), en_bin(b)), en_bin(region)),
        en_bin("s3"),
      ),
      en_bin("aws4_request"),
    ),
    en_bin(
      `AWS4-HMAC-SHA256\n${a}\n${f}\n` +
        sha256(en_bin(`${h}\n${e.join(";")}\nUNSIGNED-PAYLOAD`)).reduce(
          hex,
          "",
        ),
    ),
  ).reduce(hex, "");
};
