---
name: hono-core-error-handling
description: app.onError, HTTPException, and the boundary between thrown errors and rendered error pages
---

# Error Handling

## `app.onError`

A single app-wide error handler catches anything thrown by a route handler or middleware that isn't caught locally:

```ts
app.onError((err, ctx) => {
  // inspect err, return a Response
})
```

This boilerplate doesn't hand-write this handler — it registers the SDK's `createStorefrontErrorHandler()` from `@scayle/storefront` first thing in `src/server/index.ts`, before any other middleware:

```ts
app.onError(createStorefrontErrorHandler())
```

Registering it first means it catches errors from every middleware and route registered after it, including the storefront runtime setup itself. The SDK handler logs the error with structured context and renders a bare-bones error page (deliberately without shared Inertia props, so a throwing shared prop can't also crash the error page).

## `app.notFound`

Hono calls the app-wide not-found handler for every request no route matches, after the global middleware ran, and for every `ctx.notFound()` call. A sub-app mounted with `app.route(...)` has no handler of its own here: `ctx.notFound()` inside `ssrRouter` still calls the root app's handler.

This boilerplate registers the SDK's handler right after the error handler in `src/server/index.ts`:

```ts
app.notFound(createStorefrontNotFoundHandler())
```

It renders the `NotFound` page with shared props, or a plain-text `Not Found` when the request has no storefront context. The base page controllers call `ctx.notFound()` from their default `renderNotFound()`, so a missing product, category, CMS page, order, or search term all end up here. Override `renderNotFound()` on one controller to change only that page's 404 response.

## `HTTPException`

Hono's `HTTPException` (from `hono/http-exception`) is a thrown error carrying an HTTP status:

```ts
import { HTTPException } from 'hono/http-exception'

throw new HTTPException(404, { message: 'Not found' })
```

An `HTTPException` thrown anywhere in the middleware/handler chain passes through `app.onError` with its original status intact — the storefront error handler preserves it rather than flattening every error to 500. Use this when a handler or service needs to signal a specific HTTP status; a plain `throw new Error(...)` reaches the same handler but without a status, and gets treated as a generic failure.

## Errors before the runtime middleware

An error thrown before `createStorefrontRuntime(...)` has run (for example, in the OpenTelemetry or compress middleware) still reaches `app.onError`, but `ctx.get('storefront')` and friends aren't populated yet. The SDK error handler accounts for this and falls back to a generic message with no stack leak rather than crashing while trying to read context that isn't there.
