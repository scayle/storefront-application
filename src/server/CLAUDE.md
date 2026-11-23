# CLAUDE.md — Server

## Controllers (`controllers/`)

Parse params, orchestrate services, pass props via `ctx.render()`. No business logic. Resolve mappers and services per request from `ctx.get('mappers')` / `ctx.get('services')`, never construct them. Page controllers with an SDK base class (product detail, listing, CMS pages) extend it and implement only the shop hooks.

```ts
export class ProductDetailController extends BaseProductDetailController<'ProductDetail'> {
  protected override getTemplate(_product: DetailedProduct): 'ProductDetail' {
    return 'ProductDetail'
  }

  protected override getViewProps({ product }: { product: DetailedProduct }) {
    return {
      product, // eager
      similarProducts: Inertia.defer(
        () => this.fetchSimilarProducts(product.id),
        { group: 'recommendations' },
      ),
      hreflangs: Inertia.serverOnly(() => this.fetchHreflangs(product.id)),
    }
  }
}
```

- Pages with a 404 path call `renderNotFound()`, which renders the handler registered in `index.ts`. Override it only when one page needs a different 404.
- Pages without domain data (sign-in, static content) extend `BaseController<TTemplate>` and declare only `getTemplate()` and `getViewProps()`.
- Session customer typing uses the SDK `Customer`, widened through `declare module '@scayle/storefront/types'`.

## Inertia shared data (`middleware/sharedData.ts`)

Props every page receives, built with `createSharedDataMiddleware`. All are `Inertia.once`. `.defer()` chains on top for props that must not block the first render.

| Prop                                                                                | Kind                                                         |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `navigation`, `footer`, `cmsEditorData`, `availableCountries`, `availableLanguages` | once                                                         |
| `campaign`                                                                          | once, TTL `CAMPAIGN_CACHE_TTL_SECONDS`                       |
| `promotions`                                                                        | once + deferred, TTL `PROMOTIONS_CACHE_TTL_SECONDS`          |
| `basket`, `wishlist`                                                                | once + deferred, group `customer-data`                       |
| `customer`                                                                          | once, deferred (group `customer`) only on a cacheable render |
| `shopSuggestion`                                                                    | once + deferred, group `customer`, `null` when empty         |

- `basket`, `wishlist` and `promotions` catch their own errors so a Storefront API failure resolves the `<Deferred>` fallback and leaves sibling props alone. They return `null`, `null` and `[]`.
- `customer` returns `null`, never `undefined`: Inertia omits `undefined`, which would leave a stale customer after logout.
- A once prop a shop picks by segment goes into `SEGMENT_DEPENDENT_ONCE_PROPS` (`src/shared/constants/segments.ts`). `useAuthentication` reloads those after login and logout.
- `customer` is eager whenever the render is not a shared-cache candidate (`request.isRouteCacheable` is `false`), because the session loads anyway. `navigation` and `footer` are the same for every customer. `SEGMENT_DEPENDENT_ONCE_PROPS` ships empty. `campaign` has no catch because `fetchActiveCampaign()` returns `null` instead of rejecting. The SDK skips requests with no resolved country, so the callback only declares props.
- Server-only props (hreflangs, JSON-LD) are declared per controller, not shared. Page prop keys must not collide with shared keys.

## Page prop rules

Modifier semantics are in the `inertia` skill. These rules are not compiler-enforced.

- **Every page prop is public.** Modifiers control re-send timing, not visibility. The SSR HTML contains every value. Never pass sensitive data as a prop.
- **No `await Promise.all([...])` for page data.** Give each value its own `Inertia.defer(() => …)`, so the slowest call does not gate the page. Batching API calls inside one service method is still right.
- **Split defer boundaries by cost.** A cheap value bundled with an expensive one leaves the initial HTML for nothing. A slow member delays its whole group.
- **Every prop gets a one-line JSDoc.** For deferred props, say what renders while the value is absent.
- **Send `null`, not `undefined`, when a prop must be able to change on the client.** Catch inside the callback where a failed fetch would strand the UI in `<Deferred>`.
- **Renaming a deferred prop is a cross-file change.** Update every `only:` array and `<Deferred>` `:data` in `src/client/` in the same commit. The rename type-checks and then stops reloading.

## Dependency injection

Constructor injection, no framework. `registries.ts` defines the blueprints (`createMapperRegistry` / `createServiceRegistry`), exposed as `ctx.get('mappers')` / `ctx.get('services')`.

```ts
export const serviceRegistry = createServiceRegistry({
  productDetail: ({ storefront, mappers, services }) =>
    new ProductDetailService(storefront, mappers, services),
  // `request` carries headers, client IP and session.
  customer: ({ storefront, mappers, request }) =>
    new CustomerService(storefront, mappers, request),
})
```

- A service factory receives the per-request `RequestContext`: `storefront`, `mappers`, `services`, `request`. Destructure what the service takes. oRPC handlers get the same object.
- Mapper factories receive only `{ storefront, mappers }`. That is why `ServerI18nService` sits in the mapper registry.
- Take the full `MapperRegistry` / `ServiceRegistry` in a new service constructor, not a narrow `{ campaign }` bag, unless the caller cannot assemble the registry.
- A value from `mappers.*` / `services.*` looks wrong or missing: check `registries.ts` first. Key, factory and dependencies are all there.

### Registry slots and mappers

Typing rules (`MapperOverrides`, concrete subclass, mocks) are in `v3/CLAUDE.md`. Application specifics:

- A mapper extends the SDK base and overrides with `override`, calling `super.mapX(...)` first. A missing `super` call type-checks and silently drops the base fields, so check it by hand. Never rebuild the base shape.
- Recursive shapes (navigation tree): the base recurses through `this.mapX`, so an override applies at every depth. Write no second traversal.
- A structural mapper contract is named `<Domain>Mapping` (`FilterMapping`), never `<Domain>Mapper` (the base class) or `<Domain>MapperContract`. Never add a generic parameter to a slot.
- Declare a slot in `MapperOverrides` only when something reads a member the SDK type lacks. Don't re-declare the SDK's own type. Registering the subclass alone is enough when consumers use the base contract.
- Never read a slot through a type assertion (`this.mappers.x as Y`). If it is needed, the slot is missing from the overrides.
- A declared slot without a factory fails to compile in `registries.ts`. An extra factory without a slot compiles and is unreachable.
- A concrete base mapper (`NavigationMapper`, `CampaignMapper`) can be registered as-is. Extend it only to add fields. An abstract one (`CategoryMapper.getPath`) needs the abstract method implemented, with no `super` call.
- A mapper reaches another domain through the registry (`mappers.category.getPath(...)`), never an import.
- Don't add a service class here when `@scayle/storefront` owns the domain. Extend the SDK service and register the subclass.

### Absolute URLs

- Every absolute URL the server emits (canonical, hreflang, JSON-LD base, `og:url`, OnlineStore `url`) comes from `request.url` or `request.origin`. Never compose an origin from a scheme literal and a config value.
- `ctx.req.url` is for path matching only (routing, redirects, response-cache keys, country detection). Behind a proxy its host is not the public host. `request.origin` resolves to `country.domain` in domain mode, `config.domain` when pinned in the path modes, and the request host otherwise, with the scheme from `x-forwarded-proto` (`http` and `https` only).
- Service factories and oRPC handlers get the `RequestContext`, never the Hono context. Its `request` carries `headers`, `query`, `originalIp` and `origin` (captured once), plus `url`, `session` and `isRouteCacheable` as live getters (`url.href` embeds a fresh `URL`). A service needing request-scoped input (`CustomerService`) is registry-resolved, never hand-constructed.
- Hreflang caches store per-country paths, never absolute hrefs. Cache keys carry no host, so a cached href serves the first visitor's host to everyone. Compose the URL after the cache read.

### Mapper rules

- Classes. Take `StorefrontContext`, plus `MapperRegistry` when a collaborator is needed. Resolved from the registry, never constructed by a controller or oRPC handler.
- Deterministic: no Storefront API calls in mapper methods, no caching of mapped payloads, no mutable cross-request state on the instance.
- Optional-chain every Storefront API field read, including ones the SDK type declares required. Types can lag the API (`campaign.color?.background` with a fallback).
- Derive state server-side and prune the raw inputs from `publicFields`.
- Prefer list-level methods (`mapProducts(list, opts)`) over per-item callbacks.
- A mapper that takes part in `with:` selection exposes it as a `get Includes()` getter, plus one sibling per further use (`ProductMapper.DetailedIncludes`). Read it from the registry slot (`this.mappers.basket.Includes`), never a static or literal, so overrides reach every call.

### Caching

The SDK services that own a Storefront API call cache it with their own TTL constants. Application code caches through `context.storefront.cache.getOrSet(key, fetchFn, ttlSeconds)` (example: `src/server/api/cms.ts`). Cache raw API responses, not mapped output, so a mapper change needs no flush.

## Other server directories

- `services/mappers/`: the concrete mapper subclasses, one per slot. `services/i18n.ts`: `ServerI18nService`, registered as the `i18n` mapper slot.
- Analytics: both slots come from `@scayle/storefront` and register without a subclass. `index.ts` mounts the SDK's `mountAnalyticsRoute` (`POST /api/analytics/events`) with this shop's `isConsentRequired`, before `sharedDataMiddleware` and `mountAPIRouter`. It is mounted bare and under `/:country` because `sendBeacon` cannot send `X-Shop-Country-Id`. Call the forward service only from that route. It skips the Storefront API call in dev (`import.meta.env.DEV`) and stores nothing in the session.
- `cms/`: keeps its own `controllers/cms-page.ts` and `middleware/csp.ts` so a shop deletes unused providers in one place. `providers/<provider>/service.ts` binds the package to the generated types, declares the provider's Zod env schema and exports `parseCmsEnv()` (called at boot). A new provider needs both, plus a `CMS_PROVIDER` enum entry in `vite.config.ts`. `providers/scayle/` is the placeholder fallback and the typecheck target of the `@cms-*` aliases.
- `types/index.ts`: `declare module` augmentations. `index.ts`: app entry (error and not-found handlers, runtime, health probe ahead of global middleware, API and SSR routers).

## Routing (`ssr-routes.ts`)

Every pattern comes from `routes` in `@shared/routes`. Never inline a path literal. Mount with `mountController(ssrRouter, routes.x, XController)`. `/account/*` is gated by `createAuthGuardMiddleware({ redirectTo: routes.signin })`. There is no catch-all: unmatched paths reach `app.notFound(...)` in `index.ts`. Each mount carries a comment saying whether the route is cacheable and why.

## Redirects

Controllers (`this.inertia`), route handlers (`ctx.get('inertia')`) and the auth guard use `inertia.navigate(to, status?)`. Pass the target unlocalized (`routes.accountOrders`, a mapper's `link`).

- A site-relative path is localized by `localizeLink` and followed as an Inertia visit.
- An absolute or cross-origin URL gets a full page load and keeps your status.
- A scheme other than `http` or `https` throws.
- `302` becomes `303` on PUT, PATCH and DELETE. Pass `301` for a canonical URL.
- `inertia.redirect(url)` is for targets outside the Inertia app (API route, payment provider). It answers an Inertia request with `409` + `X-Inertia-Location`, takes no status, and does not localize. A full page load gets `302` (`303` on PUT, PATCH and DELETE).
- `ctx.redirect` is only for middleware that normalizes the incoming URL (trailing slash, country prefix, panel redirects, CMS preview), whose targets already carry the right prefix. Panel redirects to an absolute target answer an Inertia visit with `inertia.redirect()`, so the `409` matches every other one. ESLint rejects it in `controllers/` and `ssr-routes.ts`.

Client side: `useRoute().navigate` (see `src/client/CLAUDE.md`, Navigation).

## oRPC API (`api/`)

Mutations ONLY. NEVER use it for page data, use controllers and `ctx.render()`.

```ts
export const getProductsByIdsDefinition = defineRpc({
  route: { method, summary },
  input: zodInputSchema,
  output: zodOutputSchema,
  errors: { ERROR_KEY: { message, status } },
  handler: async ({ input, context, errors }) => { ... },
})

export const cmsRouter = {
  getProductsByIds: buildRpc(base, getProductsByIdsDefinition),
}
```

- The builder (`base` public, `authed` authenticated) decides who may call. `api/base.ts` composes both from the SDK factories `createBase()` and `createOrpcAuthMiddleware(base)`. Neither takes a `Customer` type argument. Never hand-author `os.$context()` or `base.middleware()` per route. A handler never reads `context.accessToken`, reach the token through services.
- `context` is the request's `RequestContext`. Resolve collaborators from its registries.
- Basket, wishlist, auth, search and profile RPCs ship in the SDK. `api/index.ts` assigns `create*Router(base)` on `apiRouter`. A newly added SDK domain stays off until assigned there.
- Customize an SDK RPC in `api/index.ts`, never by copying it. Chain `.errors(...)` / `.use(...)`, or spread its exported definition, swap one part and `buildRpc(base, ...)`. See the `orpc` skill.
- Rebuild a profile RPC on `authed`, never `base`, or it loses the access token check. Example: the SDK's `profile.updatePassword` accepts any new password and leaves policy to the Customer Account API, so rebuild it on `authed` with a stricter `newPassword` schema from `@shared/constants/password`.
- Zod schemas are inline above their definition. Reuse a TypeScript type when recreating the schema is impractical (no runtime validation). Define custom error codes with HTTP status.

## Testing

Node environment. Use `createMockStorefrontContext()`, `createMockSession()` and `createMockRequestContext()` from `src/test/utils/context.ts`. `@scayle/storefront/test` and `vitest` are ESLint-blocked outside `*.test.ts` and `src/test/`, importing them in application code bundles the test runner or fails at runtime.
