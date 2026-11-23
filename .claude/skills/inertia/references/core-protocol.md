---
name: inertia-core-protocol
description: What Inertia actually does — SSR HTML vs. JSON page-visit responses, the page object, the X-Inertia header
---

# Protocol

Inertia is not a client-side router and not a JSON API framework. It's a thin protocol layered over normal HTTP: the same server route returns either a full HTML document or a JSON "page object," depending on one request header.

## First load vs. subsequent navigation

- **First load** (typing a URL, hard refresh): no `X-Inertia` header on the request. The server renders full HTML — head, body, the Vue app mounted with initial props inlined as JSON in the page (SSR renders this on the server; see [core-client-setup](core-client-setup.md)).
- **Subsequent navigation** (clicking an Inertia `<Link>`, calling `router.visit(...)`): the client's Inertia adapter sends the request with `X-Inertia: true`. The server responds with **JSON only** — the page object — instead of a full HTML document. The client swaps in the new page component and props without a full page reload.

This is why a Hono route handler doesn't need an `if (isInertiaRequest)` branch of its own — `ctx.render(component, props)` (see [core-server-rendering](core-server-rendering.md)) handles both cases internally and returns the right response shape either way.

## The page object

The JSON payload (and the object embedded in the initial HTML) has this shape:

```ts
{
  component: string        // e.g. 'ProductDetail' — matches a key registered in `Components`
  props: Record<string, unknown>
  url: string               // current path + query string
  version: string | number  // asset version, used to detect stale bundles
  clearHistory?: boolean
  encryptHistory?: boolean
  deferredProps?: Record<string, string[]>  // prop names to fetch after initial render, grouped
  onceProps?: Record<string, { prop: string; expiresAt: number | null }>
}
```

The client's `resolve` function (in `createInertiaApp`, see [core-client-setup](core-client-setup.md)) maps `component` to an actual Vue component file.

## Partial reloads and the request headers that drive them

A partial reload asks the server to re-run only some of a page's props, not the whole component tree. The client sends extra headers that the server-side `Inertia` class reads to decide what to resolve:

| Header                        | Meaning                                                                                         |
| ----------------------------- | ----------------------------------------------------------------------------------------------- |
| `X-Inertia-Partial-Component` | The component this partial reload targets — if absent, it's a full page load or full navigation |
| `X-Inertia-Partial-Data`      | Comma-separated prop names to include (`only`)                                                  |
| `X-Inertia-Partial-Except`    | Comma-separated prop names to exclude (`except`)                                                |

This app's server-side `Inertia.isMainRequest()` checks specifically for the absence of the partial-component header to distinguish "full page load, run everything" from "partial reload, run only what was asked for" — see [core-server-rendering](core-server-rendering.md).

## External redirects

A route handler can't simply return a `Location` redirect from an Inertia request — the client's `fetch`-based navigation would follow it as a same-page XHR redirect, not a real browser navigation. Inertia's convention is a `409 Conflict` with an `X-Inertia-Location` header; the client adapter intercepts that status and does a real `window.location` navigation instead. This app exposes it as `inertia.redirect(url)` — see [core-server-rendering](core-server-rendering.md).
