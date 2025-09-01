// https://web.archive.org/web/20140302054859/https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html#query-string-auth-v4-signing-example

import { write_vectors } from "../test.ts";

await write_vectors(import.meta, {
  signature_v4: await fetch(
    "https://web.archive.org/web/20140302054859/https://docs.aws.amazon.com/AmazonS3/latest/API/sigv4-query-string-auth.html#query-string-auth-v4-signing-example",
  ).then(($) => $.text()).then(($) =>
    /<code class="code">(?<path>.+?)<\/code>.*?<code class="code">(?<bucket>.+?)<\/code>.*?\((?<time>\d+).*?<code class="code">(?<date>.+?)<\/code>.*?<code.*?<code.*?<code class="code">(?<region>.+?)<\/code>.*?<code class="code">(?<id>.+?)<\/code>.*?<code class="code">(?<key>.+?)<\/code>.*?:<\/p><pre class="programlisting">(?<url>.+?)<\/pre>/s
      .exec($.slice($.indexOf('id="query-string-auth-v4-signing-example"')))
      ?.groups ?? null
  ),
});
