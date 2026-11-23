---
name: orpc
description: oRPC as used by the Storefront Application V3 for type-safe mutations (the base/authed procedure builders, defineRpc definitions built with buildRpc, error codes, the client's safe RPC client, and testing). Use when adding or changing a route in src/server/api/, customizing an RPC that ships in @scayle/storefront (basket, wishlist, auth, search), or calling a mutation from a client composable via useRpcClient().
---

oRPC is the third foundational pillar of this stack alongside [hono](../hono/SKILL.md) and [inertia](../inertia/SKILL.md). It handles every **mutation** (basket, wishlist, auth, profile) as a typed, validated procedure; Inertia handles all page rendering and never submits forms. The two never overlap: if a change writes data, it's an oRPC route, not a controller.

> The skill is based on `@orpc/server` / `@orpc/client` 1.14.x, generated at 2026-08-06. It covers the builder pattern and conventions this boilerplate actually uses: the procedure/error/client shape, not oRPC's full feature set (no streaming, no event iterators, no OpenAPI-spec authoring beyond what `mountAPIRouter` already wires up).

**Full documentation**: [orpc.unnoq.com/llms.txt](https://orpc.unnoq.com/llms.txt).

For where mutation logic itself belongs (services, mappers, the registry) see [src/server/CLAUDE.md](../../../src/server/CLAUDE.md). That file also has the short builder-pattern skeleton. This skill goes deeper: the actual error-code conventions, the client-side safe-call pattern, and testing both sides.

## Core

| Topic              | Description                                                                                                                                                        | Reference                                                        |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Procedure Builder  | `base`/`authed`, `defineRpc({ route, input, output, errors, handler })` and `buildRpc(builder, definition)`, the `RequestContext` a handler receives               | [core-procedure-builder](references/core-procedure-builder.md)   |
| Error Codes        | Declaring typed errors in a definition's `errors` map, throwing them, HTTP status mapping, when to mask an upstream failure                                        | [core-error-codes](references/core-error-codes.md)               |
| Router Composition | Grouping procedures into a domain router, assigning the SDK domain routers on `apiRouter`, customizing an SDK RPC, `APIRouter` type, mounting via `mountAPIRouter` | [core-router-composition](references/core-router-composition.md) |

## Features

| Topic                  | Description                                                                                                        | Reference                                                        |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| Client Calling Pattern | `useRpcClient()`, the safe-call tuple/object result, `isDefined`/`isSuccess`, the mutate → reload → toast sequence | [features-client-calling](references/features-client-calling.md) |
| Testing                | `call()` for direct procedure tests, mocking services on `RequestContext`, testing `authed` rejection              | [features-testing](references/features-testing.md)               |

## How this boilerplate uses oRPC

- The basket, wishlist, auth, search, and profile RPCs ship in `@scayle/storefront`. `src/server/api/index.ts` assigns `createBasketRouter(base)`, `createWishlistRouter(base)`, `createAuthRouter(base)`, `createSearchRouter(base)`, and `createProfileRouter(base)` on `apiRouter`, so they run on this application's `base` and pick up its middleware and error codes. Customizing one means replacing its key in `index.ts`, not editing a route file (see [core-router-composition](references/core-router-composition.md)).
- The routes this application owns live under `src/server/api/`, one file per domain (`cms.ts`), each exporting a router object (`cmsRouter`) added to `apiRouter` next to the SDK domains. Write each new RPC as a `defineRpc({...})` definition and build it into the router object with `buildRpc(base, definition)` or `buildRpc(authed, definition)`, the same way the SDK builds its own. Adding a new domain means a new file plus one line in `index.ts`.
- `base` and `authed` (`src/server/api/base.ts`) are the only two procedure builders. There's no per-domain builder. Every route file imports one or both from `./base`, and the SDK domain routers take `base`.
- Zod schemas for input/output are defined inline in the route file, right above the definition that uses them. There's no separate `schemas/` directory to keep in sync.
- The client never calls `fetch`/oRPC's raw client directly. Every mutation goes through `useRpcClient()` (`src/client/composables/useRpcClient.ts`), which returns an `@orpc/client` `SafeClient`. Calls resolve to a result object instead of throwing, so callers branch on `error`/`isDefined` rather than try/catch.
- oRPC and Inertia intentionally don't talk to each other automatically: a successful mutation does not update the page's Inertia props by itself. Composables call `partialReload([...])` (see the [inertia](../inertia/SKILL.md) skill) right after every mutation, failed ones included, to pull the changed props (basket, wishlist) back into the current page.
