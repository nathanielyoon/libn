# @libn/router

Simple HTTP router.

## default

Prefix named path parameters with a `?`, and append a `?` for a catch-all.

```ts ignore
import { Router } from "@libn/router";

// Parameterize if passing extra arguments to `app.fetch`
const router = new Router<[Deno.Addr]>()
  // Method-chain routes
  .route("GET", "/hello", ({ url }) => {
    const name = url.searchParams.get("name");
    return name ? `Hello, ${name}!` : 400;
  });
// Or add them later, order is irrelevant
router.route("POST", "/upload/?user/?", async ({ path, request }) => {
  const result = await uploadFile({
    user: path.user,
    blob: await request.blob(),
    path: path[""].join("/"),
  });
  if (!result.state) return Response.json({ error: result }, { status: 400 });
  return null;
});

// Use in `Deno.serve` callback
Deno.serve((request, info) => router.fetch(request, info));

// Export as `Deno.ServeDefaultExport` for `deno serve`
export default {
  fetch: (request, info) => router.fetch(request, info),
} satisfies Deno.ServeDefaultExport;

// Use in `Bun.serve`
Bun.serve(router);

// Export as a Cloudflare Workers ES Module
interface Env {
  SECRET_KEY: string;
}
export default new Router<[Env, ExecutionContext]>().route(
  "GET",
  "/key",
  (_, env) => env.SECRET_KEY,
) satisfies ExportedHandler<Env>;
```
