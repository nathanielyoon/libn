import { get, set } from "../test.ts";

const [docs] = await Promise.all([
  get`web.archive.org/web/20140302054859/https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html#query-string-auth-v4-signing-example`,
]);

await set(import.meta, {
  sign:
    /<code class="code">(?<path>.+?)<\/code>.*?<code class="code">(?<bucket>.+?)<\/code>.*?\((?<time>\d+).*?<code class="code">(?<date>.+?)<\/code>.*?<code.*?<code.*?<code class="code">(?<region>.+?)<\/code>.*?<code class="code">(?<id>.+?)<\/code>.*?<code class="code">(?<key>.+?)<\/code>.*?:<\/p><pre class="programlisting">(?<url>.+?)<\/pre>/s
      .exec(
        docs.slice(docs.indexOf('id="query-string-auth-v4-signing-example"'))
          .replaceAll("&amp;", "&"),
      )?.groups ?? null,
}, "55cee31a454dac2d6202b11727af5f6a9cfdbbf87f1601b475984d49f13a23f1");
