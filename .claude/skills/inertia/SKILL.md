---
name: inertia
description: Inertia.js as used by the Storefront Application V3 (the custom Hono server adapter in @scayle/storefront, the Vue 3 client, and the SSR entry). Use when working on page props, ctx.render(), deferred/once/server-only props, or the client entry points (src/client/main.ts, src/client/ssr.ts).
---

Inertia.js is the protocol that connects Hono-rendered server pages to Vue 3 client components without a client-side router or a separate JSON API for page data. Storefront Application V3 uses a **custom server adapter** (`Inertia`/`HonoAdapter` in `@scayle/storefront`), not Laravel's or Rails' official adapter — the server-side API in this skill is specific to this SDK, not upstream Inertia's server-side conventions for other backends.

> The skill is based on `@inertiajs/core` / `@inertiajs/vue3` 3.6.x, generated at 2026-08-06. It covers the protocol concepts and the actual client/server API surface this boilerplate uses — not every Inertia feature that exists upstream (no `useForm`, no validation-error props; see "How this boilerplate uses Inertia" below).

**Full documentation**: [inertiajs.com/docs/llms.txt](https://inertiajs.com/docs/llms.txt). This skill's server-rendering coverage is specific to this app's custom Hono adapter — upstream Inertia docs cover Laravel/Rails adapters and the client-side API this app also uses.

For the app's own conventions layered on top of these primitives — page/layout structure, when to use `<Deferred>`, the `useRoute().navigate()` rule, `partialReload()` — see [src/client/CLAUDE.md](../../../src/client/CLAUDE.md) and [src/server/CLAUDE.md](../../../src/server/CLAUDE.md). This skill stays one level below those: the raw Inertia protocol and API, not this app's rules for using it.

## Core

| Topic            | Description                                                                                                                           | Reference                                                    |
| ---------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| Protocol         | What Inertia actually is: SSR HTML vs. JSON page-visit responses, the page object shape, the `X-Inertia` header                       | [core-protocol](references/core-protocol.md)                 |
| Server Rendering | The `Inertia` class: `share()`, `render()`/`ctx.render()`, `redirect()` vs `navigate()`, registering page prop types via `Components` | [core-server-rendering](references/core-server-rendering.md) |
| Prop Modifiers   | `Inertia.once()`, `Inertia.defer()` (with `group`/`clientOnly`), `Inertia.serverOnly()` — when each resolves and why                  | [core-prop-modifiers](references/core-prop-modifiers.md)     |
| Client Setup     | `createInertiaApp()` in the client entry (`main.ts`) vs. the SSR entry (`ssr.ts`) — what differs and why                              | [core-client-setup](references/core-client-setup.md)         |

## Features

| Topic              | Description                                                                          | Reference                                                                |
| ------------------ | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Client Consumption | `usePage()`, `<Deferred>`, `<Link>`, `<Head>`, `router.on()` events, partial reloads | [features-client-consumption](references/features-client-consumption.md) |
| Testing            | Mocking `@inertiajs/vue3` in component tests                                         | [features-testing](references/features-testing.md)                       |

## How this boilerplate uses Inertia

- Inertia renders pages only. All mutations (basket, wishlist, profile, auth) go through **oRPC** (`@orpc/*`), not Inertia form submissions — `useForm()` is not used anywhere, and there are zero `router.post`/`router.put`/`router.patch` calls in the client. If a fork adds an Inertia-submitted form, consult [inertiajs.com](https://inertiajs.com) for `useForm` directly; this skill doesn't cover it because nothing here does it today.
- Because mutations bypass Inertia's page props, mutable shared data (basket, wishlist, user, promotions) can go stale in the browser's history cache after a back/forward navigation. `src/client/main.ts` works around this with a `popstate` listener plus a `router.on('navigate', ...)` handler that triggers a partial reload of exactly those props — see [core-client-setup](references/core-client-setup.md).
- Client code reads props through `usePage()` from `@client/composables/usePage`, not from `@inertiajs/vue3` — see [features-client-consumption](references/features-client-consumption.md).
- `usePage().props.errors` (Inertia's validation-error convention) is not read anywhere. Form validation in this app goes through **Regle** (client-side) against the oRPC contract, not Inertia's server-side validation-error prop.
- The server-side `Inertia` class and its Hono adapter live in `@scayle/storefront`, not in the boilerplate. The boilerplate only calls into it (`ctx.render(...)`, `ctx.get('inertia').share(...)`) and registers its own page prop types via `declare module '@scayle/storefront' { interface Components { ... } }` in `src/shared/types/global.d.ts`, next to the `SharedProps` augmentation for shared data. Neither interface has an index signature, so `ctx.render()` rejects an unregistered page name and `inertia.share()` rejects an undeclared key.
