---
name: inertia-core-server-rendering
description: The Inertia class (share, render, redirect, navigate) and registering page prop types via Components
---

# Server Rendering

The server-side `Inertia` class (from `@scayle/storefront`) is instantiated once per request by the SDK's Inertia middleware and exposed on the Hono context as `ctx.get('inertia')`. Route handlers rarely touch it directly — `ctx.render(...)` is the shorthand that delegates to it.

## `ctx.render(component, props, options?)`

```ts
return ctx.render('ProductDetail', {
  product, // eager — resolved immediately, included in every response
  hreflangs: Inertia.serverOnly(() => fetchHreflangs(productId)),
  similarProducts: Inertia.defer(() => fetchSimilarProducts(productId), {
    group: 'recommendations',
  }),
})
```

- `component` must be a key registered in the `Components` type (see below) — this is what the client's `resolve` function maps to an actual `.vue` file.
- `props` can mix plain values, promises, functions, and `Prop` instances (`Inertia.once`/`.defer`/`.serverOnly`) freely — the `Inertia` class resolves each based on its kind (see [core-prop-modifiers](core-prop-modifiers.md)).
- `options.status` sets the HTTP status (default `200`) — works the same for both the SSR HTML response and an Inertia JSON navigation response.
- `options.excludeSharedProps` skips merging in whatever was registered via `share()` (see below). This app uses it for the bare-bones Error page: if a shared once-prop's callback is what threw the original error, resolving it again while rendering the error page would throw a second time and crash the error page itself.
- All props resolve in parallel (`Promise.allSettled`). Outside a partial reload, the first rejection is re-thrown to the error handler. During a partial reload, a rejected prop is logged and simply omitted from the response — sibling props still resolve, and the client's `<Deferred>` fallback stays visible for the failed one rather than erroring the whole page.

## `inertia.share(data)`

Registers props merged into **every** page render for the current request, called from middleware rather than individual route handlers. This app does not call it directly: `createSharedDataMiddleware` from `@scayle/storefront` reads `inertia` and the registries from the context, skips requests without a storefront context, and passes the callback's return value to `share()`:

```ts
// middleware/sharedData.ts
export const sharedDataMiddleware = createSharedDataMiddleware(
  ({ services, request }) => {
    return {
      navigation: Inertia.once(
        async () => (await services.navigation.fetchHeaderNavigation()) ?? [],
      ),
      customer: Inertia.once(
        () => request.session.get('customer') ?? null,
      ).defer({ group: 'customer' }),
    }
  },
)
```

Multiple `share()` calls shallow-merge — a later call's keys win over an earlier call's on collision. Order middleware so anything a page-specific prop depends on has already been shared.

## `inertia.redirect(url)` vs. `inertia.navigate(url, status?)`

- **`navigate(url, status = 302)`**: the default for every page redirect from a controller, an SSR route handler, or the auth guard. A site-relative `url` is localized for the active country (`localizeLink`, which leaves an already-localized path unchanged), so pass it unlocalized. An absolute URL, or one on another origin, is answered the way `redirect()` answers it, the same split `SFLink` makes on the client, but a full page load keeps the `status` you pass where `redirect()` always sends `302`. Upgrades `302` to `303` for `PUT`/`PATCH`/`DELETE` requests so the browser follows up with a `GET` (the PRG pattern), unless you pass an explicit status like `301`.
- **`redirect(url)`**: for a route outside the Inertia app (an API route, a payment provider's hosted checkout page). On an Inertia request it answers with the `409` + `X-Inertia-Location` convention described in [core-protocol](core-protocol.md), so the client does a real browser navigation instead of an Inertia visit. On a full page load it answers with a plain `302`. It does not localize the target.

Both serialize the target with the WHATWG URL parser, so pass a URL as it is, encoded or not: existing escapes are kept and non-ASCII characters are percent-encoded once. A path that dot segments reduce to a leading `//` keeps a single slash, so it stays on the shop's origin. Both throw for an absolute target whose scheme is not `http` or `https`, such as `javascript:`, because the Inertia client assigns `X-Inertia-Location` to `window.location`.

`ctx.redirect` stays for middleware that normalizes the incoming URL (trailing slash, country prefix, panel-managed redirects). An ESLint rule rejects it in `src/server/controllers/` and `src/server/ssr-routes.ts`; see "Redirects" in `src/server/CLAUDE.md`.

## Registering page prop types (`Components`)

Every `ctx.render('SomeName', ...)` call is type-checked against a `Components` interface, augmented by the boilerplate in `src/shared/types/global.d.ts` alongside `PageProps`:

```ts
declare module '@scayle/storefront' {
  export interface Components {
    ProductDetail: ComponentProps<
      typeof import('@client/pages/ProductDetail.vue').default
    >
    // ... one entry per page component
  }
}
```

`ComponentProps<C>` extracts the `defineProps<...>()` shape directly from the `.vue` file, so the prop type a controller must supply always matches what the page component actually declares — there's no separate, hand-maintained prop interface to keep in sync. Adding a new page means adding both the `.vue` file under `src/client/pages/` and one line here; skipping the second means `ctx.render('NewPage', ...)` doesn't type-check anywhere.
