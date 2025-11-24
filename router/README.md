# @libn/router

Simple HTTP router.

## default

Define path parameters with `#name`. Only one handler runs per request.

```ts ignore
import { Router } from "@libn/router";

// Parameterize if passing extra arguments to `router.fetch`
const router = new Router<[Deno.Addr]>().route("GET /hello", ({ url }) => {
  const name = url.searchParams.get("name");
  return name ? `Hello, ${name}!` : 400;
});
router.route("POST /upload/#user", async ({ path, request }) => {
  const result = await uploadFile({
    user: path.user,
    blob: await request.blob(),
  });
  if (!result.state) return Error(result.value);
});

// Use in `Deno.serve` callback
Deno.serve(router.fetch);

// Export as `Deno.ServeDefaultExport` for `deno serve`
export default router satisfies Deno.ServeDefaultExport;

// Use in `Bun.serve`
Bun.serve(router);

// Export as a Cloudflare Workers ES Module
interface Env {
  SECRET_KEY: string;
}
export default new Router<[Env, ExecutionContext]>().route(
  "GET /key",
  (_, env) => env.SECRET_KEY,
) satisfies ExportedHandler<Env>;
```
