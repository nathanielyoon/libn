import { en_b16, en_bin } from "@nyoon/base";
import { hmac, sha256 } from "@nyoon/hash";

/** Presigns a URL for the specified method, path, and headers. */
export const presign = (
  env: { S3_HOST: string; S3_ID: string; S3_KEY: string },
  method: "HEAD" | "GET" | "PUT" | "DELETE",
  path: string,
  headers: { [header: string]: string } = {},
  time = 604800,
  region = "auto",
  date: Date = new Date(),
): string => {
  const a = date.toISOString().replace(/[-:]|\..../g, ""), b = a.slice(0, 8);
  const { hostname, pathname } = new URL(path, env.S3_HOST);
  const d: { [header: string]: string } = { host: hostname };
  for (const $ of Object.keys(headers)) d[$.toLowerCase()] = headers[$];
  const e = Object.keys(d).sort(), f = `${b}/${region}/s3/aws4_request`;
  const g = `X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Credential=${env.S3_ID}%2F${
    f.replace(/[^-.\w~]/g, ($) =>
      "%" + $.charCodeAt(0).toString(16).toUpperCase().padStart(2, "0"))
  }&X-Amz-Date=${a}&X-Amz-Expires=${time}&X-Amz-SignedHeaders=${e.join("%3B")}`;
  let h = `${method}\n${pathname}\n${g}\n`, z = 0;
  do h += `${e[z]}:${d[e[z]]}\n`; while (++z < e.length);
  return `https://${hostname}/${path}?${g}&X-Amz-Signature=` + en_b16(hmac(
    hmac(
      hmac(
        hmac(hmac(en_bin(`AWS4${env.S3_KEY}`), en_bin(b)), en_bin(region)),
        en_bin("s3"),
      ),
      en_bin("aws4_request"),
    ),
    en_bin(
      `AWS4-HMAC-SHA256\n${a}\n${f}\n` +
        en_b16(sha256(en_bin(`${h}\n${e.join(";")}\nUNSIGNED-PAYLOAD`))),
    ),
  ));
};
