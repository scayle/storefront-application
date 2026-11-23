---
name: inertia-core-prop-modifiers
description: Inertia.once, Inertia.defer (group/clientOnly), and Inertia.serverOnly — when each resolves and why
---

# Prop Modifiers

A plain value or function passed as a page prop resolves **eagerly** — on every render, blocking the response. The three modifiers change when and how often a prop resolves.

## `Inertia.once(callback, ttl?)`

Resolves on the first visit; the client caches the value and reuses it on later Inertia navigations without asking the server again.

```ts
navigation: Inertia.once(async () => (await navigationService.fetchHeaderNavigation()) ?? []),
campaign: Inertia.once(() => campaignsService.fetchActiveCampaign(), 3600), // re-fetch after 1 hour
```

- Without `ttl`: cached for the life of the client-side session (until a full page reload).
- With `ttl` (seconds): the server tracks an expiry: once expired, the next visit re-invokes the callback.
- The server knows which once-props the client already has via the `X-Inertia-Except-Once-Props` request header (parsed internally) — it skips re-resolving and re-sending those.

## `Inertia.defer(callback, options?)`

Excluded from the **initial** render; fetched by the client in a follow-up request right after the page mounts. Use for anything not needed for first paint.

```ts
similarProducts: Inertia.defer(() => fetchSimilarProducts(id), { group: 'recommendations' }),
trendingProducts: Inertia.defer(() => fetchTrendingProducts(id), { group: 'recommendations' }),
filters: Inertia.defer(() => fetchFilters()), // no group → the implicit 'default' group
```

- `options.group` (default `'default'`): deferred props sharing a group are fetched together in **one** follow-up request, not one request per prop. Group props that are logically related and roughly the same cost — this app groups PDP recommendations together, and shared customer-state props (basket, wishlist, customer) under `'customer-data'`/`'customer'` so a single page load triggers one extra round trip for all of them, not four.
- `options.clientOnly` (default `false`): when `true`, the prop **is** resolved synchronously during SSR (so it's present in the initial HTML — useful when the content matters for SEO or first paint) but is still deferred on subsequent client-side Inertia navigations. A plain deferred prop (no `clientOnly`) is deferred in both cases.
- On the client, wrap a deferred prop's consumption in `<Deferred>` (see [features-client-consumption](../references/features-client-consumption.md)) so the template has a fallback to show before it arrives.

## `Inertia.serverOnly(callback)`

Resolved during SSR and present in the initial HTML, but **never** sent in the JSON payload for a client-side Inertia navigation.

```ts
hreflangs: Inertia.serverOnly(() => fetchHreflangs(productId)), // only needed for <link rel="alternate"> in <head>
```

Use for data that only the server-rendered `<head>` needs (hreflangs, other SEO tags) — sending it on every client-side navigation would be wasted payload since the client never reads it after the first paint.

## Chaining `.once()` with `.defer()`

`Inertia.once(callback).defer({ group })` combines both: deferred (not blocking) on the very first load, then cached like any once-prop on subsequent navigations. `sharedDataMiddleware` uses this for `customer` — the session customer isn't needed to block the first paint, but once loaded it shouldn't be re-fetched on every navigation either.

## Choosing between the three

| Need                                                                       | Modifier                                    |
| -------------------------------------------------------------------------- | ------------------------------------------- |
| Expensive, not needed for first paint, changes per page                    | `defer`                                     |
| Same value across the whole session (or a long TTL), rarely changes        | `once`                                      |
| Needed in SSR `<head>` output only, irrelevant to the client-rendered page | `serverOnly`                                |
| Cheap and needed immediately                                               | none — pass it as a plain value or function |

If a prop needs to change per navigation but is expensive, prefer `defer` over `once` — `once` skips resolving it again on the client's own say-so, which is wrong for anything that's supposed to reflect current state (this is why mutable props like `basket`/`wishlist` are deferred, not cached with `once`, on their own — see [core-client-setup](core-client-setup.md) for how this app keeps them fresh after oRPC mutations anyway).
