---
name: hono-core-routing
description: Creating a Hono app, defining routes, path params, and mounting sub-apps
---

# Routing

## Creating an app

`new Hono()` takes a generic `Env` type carrying the shape of context variables (see [core-context](core-context.md)):

```ts
import { Hono } from 'hono'
import type { StorefrontVariables } from '@scayle/storefront'

const app = new Hono<{ Variables: StorefrontVariables }>()
```

Every sub-app mounted into the tree (e.g. `ssrRouter` in `src/server/ssr-routes.ts`) declares the same `Variables` shape so handlers get the same typed `ctx.get`/`ctx.set` regardless of which app they're attached to.

## HTTP method routes

```ts
app.get('/path', (ctx) => ctx.text('ok'))
app.post('/path', (ctx) => ctx.json({ ok: true }))
app.all('/path', (ctx) => ctx.text('any method'))
```

`app.all(...)` matches every HTTP method. This boilerplate does not use it for a catch-all 404 route: an unmatched path reaches the `app.notFound(...)` handler instead (see [core-error-handling](core-error-handling.md)).

## Path parameters

```ts
app.get('/users/:id', (ctx) => {
  const id = ctx.req.param('id') // string
  return ctx.json({ id })
})
```

Multiple params and optional segments:

```ts
app.get('/posts/:year/:month/:slug', (ctx) => {
  const { year, month, slug } = ctx.req.param()
})

app.get('/books/:id?', (ctx) => {
  /* :id may be undefined */
})
```

Wildcards: `/*` matches any remaining path segment(s) — used for the not-found catch-all and for scoping middleware to a subtree (`app.use('/account/*', middleware)`).

## Mounting sub-apps

A `Hono` instance is itself a valid handler, so one app can be mounted onto another. This boilerplate does this indirectly through SDK helpers (`mountSSRRouter(app, ssrRouter)`, `mountAPIRouter(app, apiRouter, options)`), which handle country-prefix routing and oRPC wiring on top of plain mounting. For a plain mount without those helpers:

```ts
const sub = new Hono()
sub.get('/', (ctx) => ctx.text('sub app root'))

app.route('/prefix', sub) // sub is now reachable at /prefix/*
```

## Route registration order matters

Hono matches routes in registration order for overlapping patterns. In `src/server/index.ts`, the oRPC API router is mounted **before** the SSR router specifically so `/api/*` doesn't get swallowed by the SSR router's country-prefix catch-all (`/:country/*`). The path-strategy redirect of unprefixed URLs onto the default country (including `/` → `/de`) runs inside `createStorefrontRuntime`, not in `mountSSRRouter`, so middleware registered after the runtime never sees an unset `ctx.get('storefront')` on those paths. `/api` and `/api/*` skip that redirect. When adding a new top-level route, check whether it could collide with an existing wildcard route registered earlier.
