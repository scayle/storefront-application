---
name: orpc-core-error-codes
description: Declaring typed error codes in an RPC definition's errors map, throwing them, HTTP status mapping, and when to mask an upstream failure
---

# Error Codes

## Declaring and throwing

The `errors` map of a `defineRpc` definition declares the typed error catalogue an RPC can throw, each with an HTTP `status` and a default `message`:

```ts
errors: {
  ITEM_ALREADY_IN_BASKET: {
    message: 'Item already in basket',
    status: HttpStatusCode.CONFLICT,
  },
  VARIANT_OUT_OF_STOCK: {
    message: 'Variant out of stock',
    status: HttpStatusCode.PRECONDITION_FAILED,
  },
  NOT_FOUND: {},              // no message/status override, falls back to oRPC's default for the code
  INTERNAL_SERVER_ERROR: {},
},
handler: async ({ errors, /* ... */ }) => {
  // ...
  throw errors.ITEM_ALREADY_IN_BASKET()       // uses the declared default message
  throw errors.ITEM_ALREADY_IN_BASKET({ message: 'more specific text' }) // override per-call
},
```

The same map goes into `.errors({...})` when chaining the builder, or onto a built RPC to add codes without rebuilding it (see [core-router-composition](core-router-composition.md)).

`HttpStatusCode` is the SDK's status enum (`@scayle/storefront`). Use it instead of a bare number so a status typo is a compile error, not a runtime surprise.

## Mapping a domain result to an error code

Data services in this codebase return a discriminated result (`{ success: boolean; error?: string }`) rather than throwing. The oRPC handler is where that gets translated into a typed HTTP error. The SDK's `basket.add` handler (`addToBasketDefinition`) does it like this:

```ts
const result = await services.basket.addItem(basketKey, {/* ... */})

if (!result.success) {
  switch (result.error) {
    case 'VariantAlreadyPresent':
      throw errors.ITEM_ALREADY_IN_BASKET()
    case 'ItemUnavailable':
      throw errors.VARIANT_OUT_OF_STOCK()
    case 'MaximumItemCountReached':
      throw errors.QUANTITY_LIMIT_EXCEEDED()
    case 'ItemDataNotFound':
      throw errors.NOT_FOUND()
    case 'ItemAddedWithReducedQuantity':
      break // not an error, falls through to the success return below
    case 'Unknown':
    default:
      throw errors.INTERNAL_SERVER_ERROR()
  }
}
```

Always include a `default:` branch that throws `INTERNAL_SERVER_ERROR()` (or another safe fallback) alongside the known `'Unknown'` case. A service's result union can grow a new member without every call site being forced to handle it, and an unhandled `switch` branch falls through silently rather than erroring.

## Masking an upstream failure

Not every internal failure should reach the client with its real status or message. The SDK's `auth.refreshAccessToken` and `auth.exchangeAuthCode` RPCs (`refreshAccessTokenDefinition` and `exchangeAuthCodeDefinition` in `@scayle/storefront`) both call the Authentication API and mask its failures down to exactly two outcomes:

```ts
try {
  const { accessToken } = await services.auth.refreshAccessToken()
  return { accessToken }
} catch (error) {
  if (getOAuthErrorStatus(error) === 429) {
    // The upstream never evaluated the refresh token, so the session is still good.
    throw errors.TOO_MANY_REQUESTS()
  }
  await session.destroy()
  throw errors.INTERNAL_SERVER_ERROR()
}
```

The reasoning that earns the exception (from the real code comment): an upstream `429` means the Authentication API rejected the request _before_ looking at the token, so the session is still valid and worth keeping for a retry. Every other failure gets the session destroyed and becomes a generic `500`. The upstream's actual message and body never reach the client either way. Copy this pattern (checking a specific upstream signal and mapping to a distinct, narrower error) rather than inventing a new one when a route depends on another service with fallible failure modes.

## `NOT_FOUND: {}` and other codes without a custom message/status

Some codes in `errors` are declared with an empty object (`NOT_FOUND: {}`, `INTERNAL_SERVER_ERROR: {}`). This still registers the code as throwable and type-checked. It just uses oRPC's built-in default message and status for that code name instead of a custom one. Do this when the default is already correct for the situation and there's nothing route-specific to say.

## Throwing a raw `ORPCError` instead of a declared code

An RPC can throw `ORPCError` directly for one of oRPC's own built-in common codes (`COMMON_ORPC_ERROR_DEFS`, from `@orpc/client`) without declaring it, the same way every procedure can throw `UNAUTHORIZED` once composed from `createBase()` (see above), except the common codes come from oRPC itself rather than this SDK. The SDK's `basket.remove` (`removeFromBasketDefinition`) does this: it declares no errors and throws `new ORPCError('INTERNAL_SERVER_ERROR', { message: result.error })` when the basket service call fails.

Prefer declaring the codes in `errors` on new routes so the set of codes a route can throw is visible at the call site without reading the handler body. The SDK's `profile.updatePassword` (`updatePasswordDefinition`) is the worked example: it declares `FORBIDDEN` and `BAD_REQUEST` and maps a Customer Account API `403` and `400` to them. Reach for a raw `ORPCError` only for a common code that needs no declaration-time customization, and document it with `@throws` too, since the definition doesn't show it.
