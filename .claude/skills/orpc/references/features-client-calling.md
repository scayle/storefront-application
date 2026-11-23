---
name: orpc-features-client-calling
description: useRpcClient(), the safe-call result shape, isDefined/isSuccess, and the mutate-then-reload-then-toast sequence
---

# Client Calling Pattern

## `useRpcClient()`

Every mutation from the client goes through this composable, never a raw `fetch` or oRPC's throwing client directly:

```ts
import { useRpcClient } from './useRpcClient'

const rpcClient = useRpcClient()
const { error, data, isDefined, isSuccess } = await rpcClient.basket.add({
  variantId: 123,
  quantity: 1,
})
```

`rpcClient.<domain>.<method>` mirrors the router shape from [core-router-composition](core-router-composition.md): `basket.add` calls the `add` key of the basket router `createBasketRouter` returns, or whatever `src/server/api/index.ts` put under that key instead.

## Why it never throws

`useRpcClient()` returns an `@orpc/client` `SafeClient` (built with `createSafeClient` in `src/client/plugins/orpcBrowser.ts`), not the raw client. A raw oRPC client call throws on any error, typed or not; the safe client instead resolves to a result every time, usable either as a tuple (`const [error, data] = await ...`) or destructured as an object (`const { error, data } = await ...`). This codebase consistently uses the object form:

```ts
type SafeResult<TOutput, TError> =
  | { error: null; data: TOutput; isDefined: false; isSuccess: true }
  | {
      error: Exclude<TError, ORPCError>
      data: undefined
      isDefined: false
      isSuccess: false
    }
  | {
      error: Extract<TError, ORPCError>
      data: undefined
      isDefined: true
      isSuccess: false
    }
```

- **`isSuccess: true`**: the call succeeded; `data` is populated, `error` is `null`.
- **`isDefined: true`**: the call failed with one of the codes the RPC declared in its `errors` map (see [core-error-codes](core-error-codes.md)). `error.code` is narrowed to exactly those codes, so a `switch (error.code)` is exhaustively checkable against what the server can actually throw.
- **`isDefined: false` and `isSuccess: false`**: the call failed, but not with a declared procedure error: a network failure, a validation error before the handler ran, or an undeclared/common code. Treat this as a generic failure. There's no narrower `error.code` to branch on.

Branch on `isDefined` before reading `error.code`. Reading `.code` on the `isDefined: false` branch isn't meaningfully typed the same way.

## The mutate → reload → toast sequence

Composables that wrap a mutation (`useBasket`, `useWishlist`, `useAuthentication`) follow the same shape. From `useBasket.ts`'s `addItem`:

```ts
const addItem = async (item: {
  productName: string
  variantId: number
  quantity: number
}) => {
  const { error, isDefined, data } = await rpcClient.basket.add({
    variantId: item.variantId,
    quantity: item.quantity,
  })

  const { error: reloadError } = await reloadBasket() // partialReload(['basket', ...])

  // the global error toast already reported the failed reload, and the add
  // may well have landed, so the composable shows nothing of its own
  if (reloadError) {
    return false
  }

  if (isDefined) {
    // narrow on error.code, show a specific toast per declared error
    switch (error.code) {
      case 'VARIANT_OUT_OF_STOCK':
        show(t('...out_of_stock_error', { productName: item.productName }), {
          type: 'ERROR',
        })
        break
      // ...
    }
    return false
  } else if (error) {
    // generic fallback: network failure or undeclared error
    show(t('...add_to_basket_error', { productName: item.productName }), {
      type: 'ERROR',
    })
    return false
  } else {
    show(t('...add_to_basket_success', { productName: item.productName }), {
      type: 'SUCCESS',
    })
    if (basket.value) trackBasket(basket.value)
    return true
  }
}
```

Five things happen in a fixed order, regardless of outcome:

1. **Call the mutation** through the safe client.
2. **Reload the affected Inertia prop(s)** via `partialReload([...])`, unconditionally, even when the mutation itself failed, because a failed mutation can still have partially changed server state worth reflecting (and because the composable needs one consistent place to detect "the reload also failed").
3. **Return early when the reload failed.** The global `httpException` or `networkError` listener in `main.ts` has already shown the error toast, with a Reload link that shows whether the mutation went through. A toast of the composable's own would be a second message, and a failure message may be false, since the mutation may well have landed.
4. **Branch three ways**: a declared procedure error (`isDefined`) gets a specific, translated message; any other mutation failure gets a generic fallback message; success gets a success toast and (for basket) a tracking event.
5. **Return a small result**, not the raw RPC result: a boolean (`addItem`, `updateItemQuantity`) or `{ success }` (`changeItemVariant`, `removeItem`, which also set `reloadFailed` so a caller can skip its own failure announcement). Callers (components) gate follow-up work (like firing a `add_to_cart` tracking event) on it rather than re-deriving success from the result shape themselves.

Follow this shape for a new mutation-wrapping composable: call, reload, return early on a failed reload, branch on `isDefined` first, then the generic fallback, then success. Don't invent a different control-flow shape for a new domain.
