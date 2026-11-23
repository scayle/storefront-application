---
name: inertia-core-client-setup
description: createInertiaApp in the client entry (main.ts) vs. the SSR entry (ssr.ts) — what differs and why
---

# Client Setup

Two separate entry files each call `createInertiaApp()`, because a browser mount and a server-side render need different `resolve`/`render`/`setup` behavior even though both build the same Vue app.

## Client entry (`src/client/main.ts`)

```ts
createInertiaApp({
  resolve: async (name) => {
    const pages = import.meta.glob('./pages/**/*.vue', { eager: false })
    const module = await pages[`./pages/${name}.vue`]()
    if (!module.default) throw new Error(`Page not found: ${name}`)
    // apply a default layout unless the page opts out
    return module.default
  },
  setup({ el, App, props, plugin }) {
    const app = createSSRApp({ render: () => h(App, props) })
    app.use(plugin).use(i18n) /* .use(...) other app plugins */
    // i18n starts without messages: only the active locale's chunk is loaded
    loadLocaleMessages(locale).then((messages) => {
      i18n.global.setLocaleMessage(locale, messages)
      app.mount(el)
    })
  },
})
```

- `setup` mounts only once the active locale's messages are registered, so hydration renders the text the server rendered. `ssr.ts` reports the locale file in `modules`, so the page carries a `modulepreload` hint for its chunk and the wait is rarely a network round trip. `src/i18n/README.md` covers which messages load where.

- `resolve` uses `eager: false` — pages are code-split and lazy-loaded on first navigation to that route, keeping the initial bundle small.
- `createSSRApp` (not `createApp`) is required even on the client: the DOM was already rendered server-side, and `createSSRApp` performs hydration (attaching reactivity to existing DOM nodes) instead of re-rendering from scratch.
- `setup` is where this app registers its Vue plugins (i18n, CMS, tracking, notifications, the browser oRPC client) and, critically, where it wires `router.on(...)` event listeners — see [features-client-consumption](features-client-consumption.md).

## SSR entry (`src/client/ssr.ts`)

```ts
export default function render(page, ssrContext) {
  return createInertiaApp({
    page, // the already-built page object, passed in rather than resolved from a request
    render: (app) => renderToString(app),
    resolve: (name) => {
      const pages = import.meta.glob('./pages/**/*.vue', { eager: true })
      // same layout-application logic as the client entry
    },
    setup({ App, props, plugin }) {
      const app = createSSRApp({ render: () => h(App, props) })
      app.use(
        plugin,
      ) /* .use(i18n).use(...) the same plugin set, plus a server-side oRPC client */
      return app // note: returned, not mounted — there's no DOM on the server
    },
  })
}
```

Differences from the client entry, and why each one exists:

|                | Client (`main.ts`)                                                                                       | SSR (`ssr.ts`)                                                                                                          |
| -------------- | -------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `resolve` glob | `eager: false` (lazy, code-split)                                                                        | `eager: true` (all pages bundled into the SSR build, no dynamic import at request time)                                 |
| `setup` return | nothing — calls `app.mount(el)` once the locale's messages have loaded                                   | `return app` — the SDK's `ServerRenderer` calls `renderToString` on it                                                  |
| `page` option  | not passed — the client reads the embedded page object from the DOM itself                               | passed explicitly — this function is invoked per-request by the server with that request's already-resolved page object |
| oRPC client    | browser client (`createBrowserOrpcPlugin`), registered only when the `storefront` shared prop is present | server client (`createSsrOrpcPlugin`), given the Hono `ssrContext` directly                                             |

Both entries apply the same "default layout unless the page opts out" logic in `resolve` — a page component with no `layout` property at all gets `Layout.vue`; a page that sets `layout: undefined` explicitly (the bare-bones Error page) stays layout-free. Keep this duplicated logic in sync if it ever changes — it isn't shared into a common module because the two `resolve` functions differ in how they glob (eager vs. lazy).

## Why `main.ts` sets `defaults.visitOptions`

Inertia requests each deferred group after the page mounts, with the URL the page has at that moment, and by default the reply sets the page URL back to that one, pushing a history entry when it differs from the current URL. A query parameter the page writes on the client with `router.replace` in between (the PDP's `variantId`, the PLP's `imageView`) is undone when a late reply arrives. `main.ts` registers `preserveUrlOnDeferredReload` (`src/client/utils/router.ts`) as the `visitOptions` default, which turns on `preserveUrl` for requests that carry Inertia's internal `deferredProps: true` flag, and only those. The cost: with `preserveUrl` Inertia leaves the history entry untouched, so Back and Forward to such a page request its deferred props again.

A `router.replace` on a page whose deferred props are still in flight also requests every pending group a second time, because the client visit copies the page's `deferredProps`. Both rounds now keep the URL; the duplicate requests remain.

## Why `main.ts` has a `popstate` listener

Because oRPC (not Inertia) performs all mutations, the browser's Inertia history cache can hold a **stale** copy of mutable shared props (basket, wishlist, user, promotions) after a back/forward navigation — the props were correct when that history entry was first visited, but an oRPC mutation on a _different_ page since then may have changed them. `main.ts` sets a flag on `popstate` and, on the next `router.on('navigate', ...)` event, triggers a partial reload (see [features-client-consumption](features-client-consumption.md)) of exactly those props via `partialReload()` (`src/client/utils/router.ts`) — restoring freshness without reloading the whole page or its page-local state (filters, sort, pagination).
