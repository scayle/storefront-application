---
name: inertia-features-client-consumption
description: usePage(), <Deferred>, <Link>, <Head>, router.on() events, and partial reloads
---

# Client Consumption

## `usePage()`

Reactive access to the current page object (see [core-protocol](core-protocol.md)) from anywhere in the component tree — no prop drilling needed for shared data.

Import it from `@client/composables/usePage`, not from `@inertiajs/vue3` (ESLint enforces this). The wrapper returns the shared-prop contract without Inertia's own `[key: string]: unknown` index signature, so a misspelled prop name is a compile error instead of `unknown`, and it narrows `component` to a registered page name:

```ts
import { usePage } from '@client/composables/usePage'

const page = usePage()
page.props.storefront // shared props, checked against the contract
page.props.storefrnt // compile error
page.url
page.component // PageComponentName
```

Shared props are in the contract by default. To read a prop that belongs to specific pages, name those pages as the type argument — the prop types come from the `Components` registry in `src/shared/types/global.d.ts`:

```ts
const page = usePage<'Search'>()
page.props.pagination?.totalItems // Search's own page prop, optional

const listing = usePage<'Search' | 'ProductListing'>()
```

Page props read this way are always optional: the caller can be mounted on a page that does not send the prop, and a deferred prop is absent until it resolves.

This is the most common page-prop read in the client codebase — composables like `useCustomer`, `useBasket`, `useWishlist` read their state this way rather than taking props, since shared data isn't passed down explicitly.

Two places still import Inertia's own `usePage` directly: the wrapper itself, and `*.stories.ts` files, which mock the module `.storybook/main.ts` aliases to `.storybook/inertia-mock.ts`.

## `<Deferred>`

Wraps a deferred prop's consumption with a fallback shown until the prop resolves:

```vue
<Deferred data="similarProducts">
  <template #fallback>
    <SFProductCardSkeleton v-for="i in 4" :key="i" />
  </template>
  <SFProductCard v-for="product in similarProducts" :key="product.id" :product />
</Deferred>
```

`data` can be a single prop name or an array of names (when a template needs several props from the same defer `group` together). Only wrap props actually created with `Inertia.defer(...)` on the server — wrapping an eager or once prop in `<Deferred>` has no effect since it's already present by the time the template renders.

## `<Link>`

Inertia's client-side navigation component — renders an `<a>` but intercepts the click to perform an Inertia visit instead of a full page load:

```vue
<Link href="/basket">Go to basket</Link>
```

In this app, prefer `SFLink` (`src/client/components/ui/links/SFLink.vue`) for most cases — it wraps `<Link>` and localizes the `to` prop automatically. Use `<Link>` directly only where `SFLink`'s localization isn't wanted.

## `<Head>`

Manages `<head>` tags (title, meta) from within a page or component, merged into the SSR-rendered `<head>`:

```vue
<Head>
  <title>{{ pageTitle }}</title>
  <meta name="description" :content="metaDescription">
</Head>
```

## `router.on(event, handler)`

Global event listeners registered once, typically in `main.ts`'s `setup()`. This app listens for:

- `'httpException'` — fired when a navigation's response was an error page; used to show a toast instead of (or in addition to) rendering the error page, and to suppress a duplicate toast if the user is already looking at that URL.
- `'networkError'` — fired when a request fails at the network level (offline, timeout); shows a generic error toast.
- `'navigate'` — fired after every completed navigation; this app uses it to detect a stale history navigation (see [core-client-setup](core-client-setup.md)) and trigger a partial reload of mutable shared props.

Each handler can call `event.preventDefault()` to suppress Inertia's default handling (e.g. skipping the built-in error page swap for `httpException` when a toast is enough).

## Partial reloads

`router.reload({ only: [...] })` re-fetches specific props for the **current** page without a full navigation. This app wraps it in `partialReload()` (`src/client/utils/router.ts`) rather than calling `router.reload` directly at most call sites, because concurrent calls requesting the _same_ prop set should coalesce into one in-flight request instead of racing:

```ts
import { partialReload } from '@client/utils/router'

const { error } = await partialReload(['basket'])
```

When `error` is set, the global `httpException` or `networkError` listener in `main.ts` has already shown the error toast, so the caller shows no message of its own for the failed reload.

Reach for `router.reload`/`partialReload` when a prop's server value has changed (for example after an oRPC mutation) and needs to be pulled into the current Inertia page object. This app's `useBasket` and `useWishlist` composables reload after every oRPC mutation, failed ones included, and `useAuthentication` reloads after a successful login or logout. Don't use it for filter/sort/pagination changes that should also update the URL. That's `useRoute().navigate(...)` with `preserveState`/`only`, documented in `src/client/CLAUDE.md`, not a bare partial reload.
