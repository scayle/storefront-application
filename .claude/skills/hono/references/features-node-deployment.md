---
name: hono-features-node-deployment
description: How the Hono app's fetch handler is wired to Node.js via @hono/node-server, and where that wiring actually lives
---

# Node.js Deployment

Hono's `app` object exposes a `fetch` handler (the Web Fetch API `Request` → `Response` signature). Running it on Node.js — which doesn't natively speak that signature — needs an adapter: `@hono/node-server`'s `serve()` wraps the app's `fetch` handler with a real `http.Server`.

## This boilerplate does not hand-write `serve()`

Unlike the routing, context, and middleware code in `src/server/`, the actual `serve()` call, port/host resolution, and graceful shutdown (`SIGINT`/`SIGTERM` handling) are **generated** by `@scayle/storefront-build`'s SSR build plugin into the production server entry (`.output/server/index.mjs`). There is no file in `src/server/` that calls `serve(...)` directly.

What the generated entry does, for reference when debugging a production startup or shutdown issue:

```ts
import app from '<serverEntry>' // src/server/index.ts
import { serve } from '@hono/node-server'

const port = process.env.PORT ? parseInt(process.env.PORT, 10) : /* default */
const hostname = process.env.HOST ?? '0.0.0.0'

const server = serve({ fetch: app.fetch, port, hostname }, (info) => {
  // logs the listening address
})

let isShuttingDown = false
let exitCode = 0
const shutdown = (code) => {
  exitCode = Math.max(exitCode, code) // worst event wins
  if (isShuttingDown) return
  isShuttingDown = true
  const forceExit = setTimeout(() => process.exit(1), 5000).unref() // close hangs
  server.close((err) => {
    clearTimeout(forceExit)
    /* exits 1 on a close error, otherwise exitCode */
  })
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))
process.on('unhandledRejection', (reason) => {
  /* logs, then */ shutdown(1)
})
process.on('uncaughtException', (err) => {
  /* logs, then */ shutdown(1)
})
```

Signals exit 0, crashes exit 1, and the code escalates: a crash landing during a
signal-initiated drain exits 1. The crash handlers are a safety net against a floating
promise terminating Node mid-request with no log line — they do not replace fixing the
failing promise at its source.

Port resolution: `process.env.PORT` → Vite config `server.port` → `3000`. Host resolution: `process.env.HOST` → `0.0.0.0`.

## What this means for a fork

- **Don't add your own `serve()` call.** `src/server/index.ts` exports the configured `Hono` app (`export default app`); the build pipeline is what turns it into a running server, in both dev (`@hono/vite-dev-server`, via the `devServer` plugin) and production (the generated entry above).
- **Register `app.onError` yourself.** The generated entry deliberately does not install one — this boilerplate's `app.onError(createStorefrontErrorHandler())` in `src/server/index.ts` is what routes uncaught errors through structured logging instead of Node's default behavior. See [core-error-handling](core-error-handling.md).
- **`x-forwarded-*` headers are already handled.** Both the dev server and the generated production entry rewrite the request URL using `x-forwarded-proto`/`x-forwarded-host` (via `requestWithForwardedHeaders`) before Hono sees it, so `ctx.req.url` reflects the original client-facing URL even behind a reverse proxy. No need to reimplement this in application middleware.
- **Graceful shutdown is already handled.** If a deployment platform sends `SIGTERM` on shutdown, the generated entry already drains in-flight connections (5s timeout) before exiting — this isn't something to add in `src/server/`.
