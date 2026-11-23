---
name: hono-core-context
description: The Hono Context object, typed Variables, request/response helpers, and ctx.get/ctx.set
---

# Context

Every handler and middleware receives a `Context` (`ctx`) as its first argument. It carries the request, response helpers, and per-request variables.

Coming from Express or Fastify: `ctx.req` wraps the standard Web Fetch API `Request`, not Node's `http.IncomingMessage` — even though this app runs on Node.js via `@hono/node-server`. There's no `req.body` stream to read manually; use `ctx.req.json()`/`ctx.req.text()` (see below) the same way you would in a browser `fetch` handler.

## Typed `Variables`

The boilerplate types context variables through `StorefrontVariables` (from `@scayle/storefront/types`), passed as the `Env` generic wherever a `Hono` instance is created:

```ts
const app = new Hono<{ Variables: StorefrontVariables }>()
```

This makes `ctx.get('storefront')`, `ctx.get('mappers')`, `ctx.get('services')`, `ctx.get('inertia')`, and `ctx.get('session')` type-checked against the SDK's variable shape rather than `unknown`. Middleware that reads or writes context variables must be typed against the same shape (see [core-middleware](core-middleware.md)).

## Reading the request

```ts
ctx.req.param('id') // path param
ctx.req.param() // all path params as an object
ctx.req.query('q') // query string param
ctx.req.header('x-custom') // request header
ctx.req.url // full URL string
await ctx.req.json() // parsed JSON body
```

`sharedData.ts` reads `ctx.req.url` and wraps it in `new URL(...)` to get a clean pathname for logging, falling back to the raw string if parsing throws (malformed URLs shouldn't crash a logging call).

## Writing the response

```ts
ctx.text('plain text')
ctx.json({ key: 'value' })
ctx.header('Content-Security-Policy', value) // set a response header
ctx.redirect('/path', 302)
ctx.status(404) // set the status for whatever body helper runs next
```

Hono's header getter/setter is the same method — call it with no second argument to read, with one to set. (`cmsCspMiddleware` is not an example of it: it works on `ctx.res.headers` directly, because it runs after `next()` and rewrites both CSP headers plus `X-Frame-Options`.)

`ctx.status(code)` sets the status for the response that follows (`ctx.text(...)`, `ctx.json(...)`); it's for handlers returning a non-200 body. `HTTPException` (see [core-error-handling](core-error-handling.md)) is for throwing an error with a status from middleware or a service — use whichever matches how the failure surfaces in your code, not both.

## `ctx.get` / `ctx.set`

Context variables are per-request key/value storage, set by earlier middleware and read by later middleware or handlers:

```ts
app.use(async (ctx, next) => {
  ctx.set('services', resolvedServices)
  await next()
})

app.get('/', (ctx) => {
  const services = ctx.get('services')
  // ...
})
```

This is how the storefront runtime middleware (`createStorefrontRuntime`, mounted internally by the SDK) hands `storefront`, `mappers`, `services`, `inertia`, and `session` to every downstream handler — see `sharedDataMiddleware` for a real example that reads four of them at once and logs which ones are missing if the runtime middleware didn't run first.

## `ctx.var` vs `ctx.get`

`ctx.var.session` and `ctx.get('session')` read the same underlying value; `ctx.var` is a typed property-access shorthand for variables, while `ctx.get(key)` takes the key as an argument. Both appear in this codebase (`sharedDataMiddleware` uses `ctx.var.session`); either is fine, prefer matching the surrounding code.
