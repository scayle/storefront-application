---
name: hono-features-testing
description: Testing Hono apps and middleware with app.request(), without a running server
---

# Testing

Hono apps are testable directly by calling `.request()` on the app instance — no server needs to be running, and no separate HTTP client library is needed. This is the pattern used across `*.test.ts` files in `src/server/` (e.g. `src/server/cms/middleware/csp.test.ts`, `src/shared/routes.test.ts`).

## Basic request assertion

```ts
import { Hono } from 'hono'
import { describe, expect, it } from 'vitest'

const app = new Hono()
app.get('/test', (ctx) => ctx.text('ok'))

describe('app', () => {
  it('responds', async () => {
    const res = await app.request('/test')
    expect(res.status).toBe(200)
    expect(await res.text()).toBe('ok')
  })
})
```

`.request()` accepts a path string, or a full `Request` object for control over method/headers/body:

```ts
const res = await app.request('/test', {
  method: 'POST',
  headers: { 'content-type': 'application/json' },
  body: JSON.stringify({ key: 'value' }),
})
```

## Testing middleware in isolation

Build a minimal throwaway app with just enough context set up to exercise the middleware under test, rather than testing against the full production app. `src/server/middleware/securityHeaders.test.ts` does this: it creates a fresh `Hono` instance typed with the `Variables` shape the middleware reads, sets only those context variables, mounts the middleware, and adds one throwaway route to assert against:

```ts
const respond = async (
  middleware: MiddlewareHandler = securityHeadersMiddleware,
  storefrontOverrides: MockStorefrontContextOverrides = {},
) => {
  const storefront = createMockStorefrontContext(storefrontOverrides)
  const app = new Hono<{ Variables: StorefrontVariables }>()
  app.use((ctx, next) => {
    ctx.set('config', storefront.config)
    ctx.set('storefront', storefront)
    return next()
  })
  app.use(middleware)
  app.get('/', (ctx) => ctx.text('ok'))
  return app.request('/')
}
```

This keeps the test independent of the real registry setup in `registries.ts`, since only the context variables the middleware reads get set.

## Project test helpers

For tests that need the full storefront context rather than a hand-rolled stub, use `createMockStorefrontContext()`, `createMockSession()`, and `createMockRequestContext()` from `src/test/utils/context.ts` (re-exported from `@scayle/storefront/test`) — see `src/server/CLAUDE.md`. Reach for a hand-built minimal app (as above) when testing a single middleware in isolation, and the project mocks when testing something that needs the real registry shape.
