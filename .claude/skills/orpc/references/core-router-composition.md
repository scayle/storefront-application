---
name: orpc-core-router-composition
description: Grouping procedures into a domain router, assigning the SDK domain routers on apiRouter, customizing an SDK RPC, the APIRouter type, and mounting via mountAPIRouter
---

# Router Composition

## One router object per domain

Each route file this application owns exports a plain object mapping method names to RPCs, each built from its definition with `buildRpc` (see [core-procedure-builder](core-procedure-builder.md)). It is not a class or a builder call, just an object literal:

```ts
// cms.ts
export const cmsRouter = {
  getProductsByIds: buildRpc(base, getProductsByIdsDefinition),
  getProductsBySmartSorting: buildRpc(
    base,
    getProductsBySmartSortingDefinition,
  ),
}
```

The object's key becomes the client-facing method name (`rpcClient.cms.getProductsByIds(...)`), which doesn't have to match the definition's name. The SDK's basket router, for example, exposes `addToBasketDefinition` as `basket.add`. Pick the object key for what reads well from the client, independent of what the handler is named internally.

## Combining into `apiRouter`

`src/server/api/index.ts` spreads the SDK's RPCs and adds the domains this application owns, then derives the router's type from the result:

```ts
import {
  createAuthRouter,
  createBasketRouter,
  createProfileRouter,
  createSearchRouter,
  createWishlistRouter,
} from '@scayle/storefront'
import { base } from './base'
import { cmsRouter } from './cms'

export const apiRouter = {
  basket: createBasketRouter(base),
  wishlist: createWishlistRouter(base),
  auth: createAuthRouter(base),
  search: createSearchRouter(base),
  profile: createProfileRouter(base),
  cms: cmsRouter,
}

export type APIRouter = typeof apiRouter
```

Each factory builds its RPCs on the `base` passed in. Middleware and error codes added to `base` with `.use(...)` and `.errors(...)` therefore reach the SDK RPCs as well. The profile RPCs are built behind `createOrpcAuthMiddleware()` inside `createProfileRouter`, so they reject guests the same way an `authed` route does. The keys are listed here on purpose: a domain the SDK adds later stays off this router until it is assigned.

Adding a new domain: create the route file with one `defineRpc` definition per RPC, export its router object of `buildRpc` calls, import it here, and add one key to `apiRouter`. `APIRouter` (the type, not the value) is what the client imports to type `useRpcClient()`, see [features-client-calling](features-client-calling.md). Client types follow every customization below, because they come from this object.

## Customizing an SDK RPC

Each factory returns a plain object, so a shop customizes that object in `index.ts` instead of copying an RPC into a route file. Pick the smallest step that does the job:

1. **Leave one out.** Destructure it away, for example `const { createOneTimeCheckoutToken: _, ...basket } = createBasketRouter(base)`, and use `basket` as the domain key. Leaving a whole domain out means not assigning its factory.
2. **Add behavior around it.** Chain `.errors({...})` and `.use(...)` on the SDK RPC. The middleware receives the validated input and wraps the handler, so a shop check, an extra error code, a remapped error code, or reading the output needs no rebuild. `.route({ summary })` retitles it in the OpenAPI spec and keeps the SDK's method and description.
3. **Swap one part** (the input, the output, the error map, or the handler). Every SDK RPC has an exported definition (`addToBasketDefinition`, `logoutDefinition`, and so on, from `@scayle/storefront`) holding its `route`, `input`, `output`, `errors`, and `handler`. Spread it, swap one part, and build it with `buildRpc`:

   ```ts
   import { z } from 'zod'
   import {
     addToBasketDefinition,
     buildRpc,
     createBasketRouter,
   } from '@scayle/storefront'

   const basket = createBasketRouter(base)
   const { input } = addToBasketDefinition

   export const apiRouter = {
     basket: {
       ...basket,
       add: buildRpc(base, {
         ...addToBasketDefinition,
         input: input.extend({
           customData: input.shape.customData
             .unwrap()
             .extend({ engraving: z.string().max(20).optional() })
             .optional(),
         }),
       }),
     },
     cms: cmsRouter,
   }
   ```

   The SDK handler stays reusable under a wider input schema or error map, since it only reads what its definition declares. A replacement handler keeps the SDK route, schemas, and error codes. Build a profile definition on `authed`, not `base`, to keep its auth check. For example, the SDK's `profile.updatePassword` accepts any new password and leaves the policy to the Customer Account API. To reject a password before that call, rebuild the RPC on `authed` with a `newPassword` schema built from `@shared/constants/password`:

   ```ts
   profile: {
     ...createProfileRouter(base),
     updatePassword: buildRpc(authed, {
       ...updatePasswordDefinition,
       input: updatePasswordDefinition.input.extend({
         newPassword: z.string().min(PASSWORD_MIN_LENGTH) /* ...the rest of the policy */,
       }),
     }),
   },
   ```

4. **Replace it.** Write a new definition, build it on `base` with `buildRpc`, and put it under the same key. Use this only when little of the SDK RPC is left after the swap.

The route, the schemas, and the error codes of an SDK RPC are public API: the client and the generated OpenAPI spec depend on them. Widening an input or adding an error code is safe. Narrowing an input or renaming a route breaks callers that rely on the SDK shape. Narrow only where this application's own client already sends the narrower shape, as the password form does for the `newPassword` schema above.

New RPCs in the SDK itself follow the same shape: a `defineRpc({...})` definition exported from the package root, built with `buildRpc` inside that domain's `create<Domain>Router` in `src/<domain>/rpc.ts`, and exported with the factory. The application assigns the factory in `src/server/api/index.ts`.

## Mounting (`mountAPIRouter`)

`src/server/index.ts` mounts the whole `apiRouter` onto the Hono app once, before the SSR router (so `/api/*` doesn't get swallowed by the SSR router's catch-all, see the [hono](../../hono/SKILL.md) skill):

```ts
mountAPIRouter(app, apiRouter, {
  interceptors: [
    onError((error) => {
      /* structured logging */
    }),
  ],
  specInfo: { title: 'Storefront RPCs', version: '1.0.0' },
  enableDocs: import.meta.env.DEV,
})
```

- `interceptors`: hooks that see every procedure call; this app uses one to log oRPC errors, routing `UNAUTHORIZED` and rate-limit codes to `warn` (routine, not exceptional) and everything else to `error`.
- `specInfo`: OpenAPI document metadata, populated from each route's `.route({ summary, description })`.
- `enableDocs`: gates the `/docs` and `/spec.json` endpoints. This app only enables them in dev (`import.meta.env.DEV`). There's no reason to ship an OpenAPI explorer in a production build.

`mountAPIRouter` is an SDK helper (`@scayle/storefront`), not something a route file calls. It's called exactly once, in the server entry.
