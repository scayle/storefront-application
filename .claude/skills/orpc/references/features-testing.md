---
name: orpc-features-testing
description: Testing oRPC procedures directly with call(), mocking services on RequestContext, and testing authed rejection
---

# Testing

oRPC procedures are tested by calling them directly with `@orpc/server`'s `call()` helper, with no HTTP request and no Hono app involved. This is a different pattern from testing a Hono route (`app.request(...)`, see the [hono](../../hono/SKILL.md) skill's testing reference) because a procedure is a typed function, not an HTTP handler wrapped around one.

## `call(procedure, input, options)`

```ts
import { call } from '@orpc/server'
import {
  createMockRequestContext,
  createMockServiceRegistry,
} from '../../test/utils/context'

const procedure = authed.handler(({ context }) => context.accessToken)
const result = await call(procedure, undefined, {
  context: createMockRequestContext(),
})
expect(result).toBe('session-access-token')
```

- First argument: the built procedure, usually a router key such as `cmsRouter.getProductsByIds` (a `buildRpc` result). `base.test.ts` instead calls `.handler()` directly on `authed`/`base` to test the auth middleware in isolation, without a real route's definition.
- Second argument: the input (`undefined` when the procedure takes none).
- Third argument: `{ context }`, a `RequestContext`, built with `createMockRequestContext()` (re-exported from `src/test/utils/context.ts`, sourced from `@scayle/storefront/test`; see `src/server/CLAUDE.md`'s testing section).

## Testing a rejection (`authed` guarding a guest)

```ts
it('throws UNAUTHORIZED when no valid token is present', async () => {
  const procedure = authed.handler(() => 'ok')
  await expect(
    call(procedure, undefined, {
      context: createMockRequestContext({
        request: { session: createMockSession({ accessToken: undefined }) },
      }),
    }),
  ).rejects.toMatchObject({ code: 'UNAUTHORIZED' })
})
```

`call()` rejects the returned promise when the procedure throws (a declared error, an `UNAUTHORIZED` from `authed`'s middleware, or an uncaught exception). Assert on it with `.rejects.toMatchObject({ code: '...' })` rather than try/catch.

## Mocking services for a real route's handler

Testing a route that reads `context.services.*` means substituting a mock services object, not a fully wired registry. A test of the `profile.updatePassword` rebuild from [core-router-composition](core-router-composition.md) would look like this:

```ts
function createContext() {
  const customerService = {
    updatePassword: vi.fn().mockResolvedValue({ id: 99 } as Customer),
  }
  const context = createMockRequestContext({
    services: createMockServiceRegistry({ customer: customerService }),
  })
  return { context, customerService }
}

it('should reject a new password with no digit', async () => {
  const { context, customerService } = createContext()

  await expect(
    call(
      apiRouter.profile.updatePassword,
      { password: 'oldPassword1', newPassword: 'Sommer-abcd!' },
      { context },
    ),
  ).rejects.toMatchObject({ code: 'BAD_REQUEST' })
  expect(customerService.updatePassword).not.toHaveBeenCalled()
})
```

- Only mock the specific service methods the route under test actually calls. `createMockServiceRegistry` from `@test/utils/context` takes each slot with only those methods and auto-mocks every other slot, so no `as unknown as ServiceRegistry` cast is needed.
- A test of an `authed` route also mocks `jose`'s `decodeJwt`, because `authed` checks the access token's expiry before the handler runs.
- Assert both the success path (mock a resolved service result, check the procedure's return value) and each mapped error path (mock a failing service call, assert the procedure rejects with the matching declared error code, see [core-error-codes](core-error-codes.md)).

## SDK RPCs

The basket, wishlist, auth, search, and profile RPCs are tested in `@scayle/storefront`, next to their definitions, so this application has no tests for them. When `src/server/api/index.ts` customizes one (see [core-router-composition](core-router-composition.md)), test the customized key through `apiRouter` with `call()`, the same way as above: mock only the services the SDK handler reads, and assert the behavior the customization adds.

```ts
import { apiRouter } from './index'

// With the engraving input from core-router-composition in place.
await expect(
  call(
    apiRouter.basket.add,
    { variantId: 1, customData: { engraving: 'x'.repeat(21) } },
    {
      context: createMockRequestContext(),
    },
  ),
).rejects.toThrow('Input validation failed')
```
