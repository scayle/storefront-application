---
name: hono
description: Hono web framework as used by the Storefront Application V3 server (routing, typed context, middleware, error handling, testing, Node.js deployment). Use when working in src/server/ on routes, middleware, the Hono context, or app.ts/index.ts wiring.
---

Hono is the backend web framework for Storefront Application V3. It handles HTTP routing and middleware; page rendering goes through Inertia.js and mutations go through oRPC, both mounted onto a Hono app (`mountSSRRouter`, `mountAPIRouter` — see `@scayle/storefront` docs and `src/server/CLAUDE.md`, not this skill).

> The skill is based on Hono 4.12.x, generated at 2026-08-06. It covers only the Hono surface this boilerplate actually uses on the Node.js runtime — not the full framework. Hono also supports Cloudflare Workers, Deno, Bun, and other runtimes; those are out of scope here.

**Full documentation**: [hono.dev/llms.txt](https://hono.dev/llms.txt) (also [llms-full.txt](https://hono.dev/llms-full.txt) for the complete unabridged docs).

## Core

| Topic          | Description                                                                                          | Reference                                                |
| -------------- | ---------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Routing        | `new Hono()`, HTTP method routes, path params, route grouping/mounting sub-apps                      | [core-routing](references/core-routing.md)               |
| Context        | Typed `Variables`, `ctx.req`, `ctx.header`/`ctx.text`/`ctx.json`/`ctx.redirect`, `ctx.get`/`ctx.set` | [core-context](references/core-context.md)               |
| Middleware     | `app.use()` ordering and path scoping, built-in middleware, `createMiddleware` for custom middleware | [core-middleware](references/core-middleware.md)         |
| Error Handling | `app.onError`, `HTTPException`, thrown vs. returned errors                                           | [core-error-handling](references/core-error-handling.md) |

## Features

| Topic              | Description                                                          | Reference                                                          |
| ------------------ | -------------------------------------------------------------------- | ------------------------------------------------------------------ |
| Testing            | `app.request()` for integration-style tests without a running server | [features-testing](references/features-testing.md)                 |
| Node.js Deployment | `@hono/node-server`'s `serve()`, graceful shutdown, static assets    | [features-node-deployment](references/features-node-deployment.md) |

## How this boilerplate uses Hono

- One root app in `src/server/index.ts` wires global middleware (OpenTelemetry, `compress`, the storefront runtime context, CSP, shared Inertia data) in a specific order, then mounts the oRPC API router and the SSR router. See the comments in that file before reordering `app.use()` calls — order is load-bearing.
- `src/server/ssr-routes.ts` is a plain `Hono` sub-app mounted by the SDK's `mountSSRRouter`. Most routes go through `mountController` (an SDK helper, not raw Hono) rather than inline handlers; a few simple pages (redirects, static views) use `ssrRouter.get(...)` directly.
- Custom middleware (`src/server/middleware/sharedData.ts`, `src/server/cms/middleware/csp.ts`) is built with `createMiddleware` from `hono/factory`, typed against the app's `Variables`.
- The only built-in middleware currently used is `hono/compress`. Anything else (`hono/cors`, `hono/logger`, etc.) is documented upstream, not vendored here — add a reference file if the boilerplate starts using one.
- The app does not use Hono's own RPC client (`hc`), JSX renderer, or WebSocket helper — type-safe mutations go through **oRPC** (`@orpc/*`, mounted via `mountAPIRouter`), an unrelated library from Hono's `hc`. If a fork adds Hono's RPC client, JSX, or WebSockets, consult [hono.dev](https://hono.dev) directly rather than this skill.
