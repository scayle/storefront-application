---
name: orpc-core-procedure-builder
description: base/authed procedure builders, defining an RPC with defineRpc and building it with buildRpc, and the RequestContext a handler receives
---

# Procedure Builder and RPC Definitions

## `base` and `authed`

Both are built once in `src/server/api/base.ts`, composed from SDK factories, never hand-authored per route:

```ts
import { createBase, createOrpcAuthMiddleware } from '@scayle/storefront'

export const base = createBase()
export const authed = base.use(createOrpcAuthMiddleware(base))
```

- **`base`**: for procedures guests and signed-in users can both call (catalog reads, basket operations keyed off the session, the auth exchange/refresh/logout routes themselves). The SDK domain routers (`createBasketRouter(base)` and the rest) build on it too, see [core-router-composition](core-router-composition.md).
- **`authed`**: for procedures that need a valid access token, such as a rebuilt profile RPC (`createProfileRouter` puts the same middleware in front of the SDK's own). Composed as `base.use(createOrpcAuthMiddleware(base))`: a guest call fails with a typed `UNAUTHORIZED` error **before the handler runs**, and the handler receives a non-null `context.accessToken`.

Choosing wrong is a real failure mode, not just a style choice: the SDK's `refreshAccessToken`, `exchangeAuthCode`, and `logout` are built on `base` even though they're about authentication, specifically _because_ the caller's access token may be expired or not exist yet by the time they're called. Building them on `authed` would make them unusable exactly then. A valid access token is not the same as being signed in: the session keeps the `customer` record and refresh token after the access token expires, so a customer whose token has expired must still be able to log out. `logout` checks the session itself and returns early for a guest, so a guest's basket and wishlist survive the call.

## Defining and building an RPC

Every RPC is a definition built on a builder: `defineRpc({...})` holds its five parts, and `buildRpc(builder, definition)` turns it into an oRPC procedure. The SDK's basket, wishlist, auth, search, and profile RPCs are written this way, and new routes in this application follow the same shape, so any RPC can be rebuilt later with one part swapped. The SDK's `updatePasswordDefinition`, for example:

```ts
export const updatePasswordDefinition = defineRpc({
  route: {
    method: 'PUT',
    summary: '...',
    description: '...',
  },
  input: passwordInput, // a Zod schema
  output: passwordOutput, // a Zod schema
  errors: {
    FORBIDDEN: {
      message: 'Current password is incorrect',
      status: HttpStatusCode.FORBIDDEN,
    },
  },
  handler: async ({ input, context: { services }, errors }) => {
    // ...
  },
})

// createProfileRouter(base) builds it behind the auth middleware
updatePassword: buildRpc(authed, updatePasswordDefinition)
```

- `route`: HTTP method and OpenAPI `summary`/`description` (surfaced in the dev-only API docs `mountAPIRouter` exposes; see [core-router-composition](core-router-composition.md)). The HTTP path is derived from the router key (`basket.add`, and so on), not from `route`.
- `input`: a Zod schema. Runtime-validates the request body/params before the handler runs; a failing input never reaches the handler. Leave it out for an RPC that takes no input (the SDK's `auth.logout`), which then has no request body in the OpenAPI spec.
- `output`: a Zod schema for the response shape. Use `z.void()` for an RPC with no meaningful return value (e.g. the SDK's `basket.remove` and `auth.logout`).
- `errors`: the typed error map, `{}` when the handler throws none of its own. See [core-error-codes](core-error-codes.md).
- `handler`: the actual logic. `defineRpc` checks it against the definition's own input, output, and error map.

`defineRpc` returns the object unchanged. It exists for the types, and so `definition.input` is non-optional when the RPC has one, which is what lets a shop write `definition.input.extend({...})`.

The builder decides who may call the RPC, not the definition: pass `base` or `authed` to `buildRpc`. The handler's `context` is typed as the plain `RequestContext` either way, so a definition never reads `context.accessToken`. Reach the token through the services instead (`services.customer`, `services.auth`), which read it from the session.

## What a handler receives

`context` is the same `RequestContext` service factories get (see `src/server/CLAUDE.md`'s dependency injection section), not the Hono request context:

```ts
handler: async ({ input, context: { storefront, mappers, services, request: { session } }, errors }) => {
  const updatedCustomer = await services.customer.updatePersonalInfo(input)
  // ...
},
```

- `context.storefront`: `StorefrontContext` (config, API client, cache, country).
- `context.mappers` / `context.services`: the same per-request registries Hono handlers and controllers read via `ctx.get('mappers')`/`ctx.get('services')`. Resolve domain collaborators from here, never hand-construct a service inside a handler.
- `context.request`: `headers`, `originalIp`, and `session` (a live getter, not a snapshot).
- On a procedure built on `authed`, `context.accessToken` is present at runtime and typed non-null in a chained `.handler()`, but not in a `defineRpc` handler, see above.
- `input`: the parsed, validated request body/params, typed from the Zod input schema.
- `errors`: typed throwers for every code declared in `errors`, plus `UNAUTHORIZED`; see [core-error-codes](core-error-codes.md).

## Zod vs. a plain TypeScript type for input/output

`src/server/CLAUDE.md` states the rule this boilerplate follows: define the schema in Zod inline in the route file, right above the definition that uses it. Reuse a plain TypeScript type instead only where recreating the shape in Zod would be impractical. That path gives build-time validation only, no runtime check on the wire. Default to Zod; reach for the TypeScript-type escape hatch only when you've hit that impracticality, not as a shortcut.
