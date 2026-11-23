---
name: hono-core-middleware
description: app.use ordering and path scoping, built-in middleware, and writing custom middleware with createMiddleware
---

# Middleware

## `app.use()` ordering and path scoping

Middleware runs in registration order, wrapping everything registered after it. `src/server/index.ts` registers global middleware in a deliberate sequence — read the comments there before changing the order:

1. a `nosniff`-only middleware — before `serveStaticAssets`, so static responses are not left bare
2. `opentelemetry(...)` — must wrap everything it traces
3. `compress()` — after tracing so compression isn't itself traced as request work
4. `createStorefrontRuntime(...)` — must run before anything reading `ctx.get('storefront')`. In `'path'` mode it also redirects unprefixed URLs (including `/`) onto the default country, so later middleware does not see an unset storefront on those requests. `/api` and `/api/*` skip that redirect.
5. `cmsCspMiddleware` — needs `services` from the runtime middleware
6. `securityHeadersMiddleware` — _after_ `cmsCspMiddleware` on purpose: both write in their
   after-`next()` phase, which unwinds in reverse registration order, so registering the baseline
   later lets the CMS framing relaxation win. Swapping the two breaks the CMS editor iframe.
   See the Security Headers page of the SCAYLE Resource Center.
7. `sharedDataMiddleware` — needs `services`/`mappers`/`inertia` from the runtime middleware

`createRedirectMiddleware(...)` is not global: `src/server/ssr-routes.ts` registers it on the SSR router, before the page controllers, so only page requests trigger a Storefront API lookup.

A middleware registered without a path (`app.use(mw)`) runs on every request. Scope it to a subtree with a path pattern:

```ts
app.use('/*', cmsCspMiddleware) // still every route, but explicit about intent
ssrRouter.use(
  '/account/*',
  createAuthGuardMiddleware({ redirectTo: routes.signin }),
)
```

`ssrRouter.use('/account/*', ...)` in this boilerplate is how the account area gets an auth guard without touching every account route individually — anything under `/account/*` passes through the guard first.

## Built-in middleware

Hono ships built-in middleware under `hono/<name>` import paths. This boilerplate currently uses one:

```ts
import { compress } from 'hono/compress'
app.use(compress())
```

Hono ships many others (`hono/cors`, `hono/logger`, `hono/etag`, `hono/jwt`, `hono/cache`, etc.) that this boilerplate does not use. If a fork adds one, check [hono.dev's middleware docs](https://hono.dev/docs/middleware/builtin) — don't guess the option shape.

## Custom middleware with `createMiddleware`

`createMiddleware` from `hono/factory` gives a custom middleware function the same typed `Context`/`Next` signature as a route handler, instead of writing the raw `(ctx, next) => {...}` signature by hand:

```ts
import type { Next } from 'hono'
import { createMiddleware } from 'hono/factory'
import type { SSRRenderContext } from '@scayle/storefront'

export const myMiddleware = createMiddleware(
  async (ctx: SSRRenderContext, next: Next) => {
    // read/set context variables, inspect the request
    await next() // MUST call next() to continue the chain
  },
)
```

Always call `next()` unless the middleware intentionally short-circuits the response (e.g. returning a redirect or an error response without calling `next()`). Forgetting `next()` silently hangs the request instead of erroring.

## Reading context variables defensively

Middleware that depends on an earlier middleware having run should check for the variable's presence rather than assuming it exists — a misordered `app.use()` call is a real failure mode, not a hypothetical one. `sharedDataMiddleware` checks all four variables it needs (`storefront`, `inertia`, `services`, `mappers`) up front, logs which ones are missing, and calls `next()` anyway rather than throwing — a page render should degrade, not crash, if a shared-data dependency is absent.
