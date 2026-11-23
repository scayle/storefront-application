# @scayle/storefront-application-v3

## 3.0.0

**Release Date:** _2026-11-23_

### 🔥 Highlights

#### 🚀 A New Foundation For Your Storefront

The Storefront Application V3 is a new foundation for the SCAYLE Storefront, built on today's web standards. One Node.js application does the work. [Hono](https://hono.dev/) serves pages and API calls, Vue 3 renders them on the server and in the browser, Tailwind CSS v4 styles them, and Vite builds everything into one deployable output, all in TypeScript. Every tool is a mainstream open source project with its own documentation and community, so your team works with skills it already has. See the [Tech Stack](https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/tech-stack) for the reasoning behind each choice.

#### ⚡ Fast Pages, Typed Actions

Inertia.js sends the browser a fully rendered first page, and every navigation after that transfers JSON instead of a whole HTML document. Pages show what users need first, such as price, images and sizes, and load slower parts like recommendations afterward. Actions such as adding a product to the basket run as typed requests through oRPC, separate from loading a page. There is no separate data-fetching layer to keep in sync with the server and no second API contract to version for page data.

#### 🧩 Commerce Logic You Extend, Not Rewrite

SCAYLE ships the commerce logic every shop shares, such as basket handling and promotion rules, as versioned packages that you update like any other dependency. The code under `src/` in your fork is yours to change. Prices, stock, promotion rules and checkout settings stay in the SCAYLE Commerce Engine and the SCAYLE Panel, so business users change them without a code change. Fixes to the application code do not reach an existing fork on their own, so your team decides when to merge them.

#### 🛠️ Built For The Team That Builds It

The Storefront CLI sets up a project from your shop's data. Storefront DevTools show the Inertia.js visits, page props and oRPC calls of each page on your machine, and instruction files help AI coding agents work in the codebase. Content comes from Storyblok, Contentful, Contentstack or Amplience, and a placeholder provider lets the application run before you connect one.

### 🚀 Major Changes

- **\[a11y\]** Moved `useFocusManagement` from a composable to plain named exports in `@client/utils/focus`, since it held no Vue reactivity or lifecycle usage.

  **\[Breaking\]** `getFirstFocusable`, `getFirstFocusableAfter`, and `FOCUSABLE_SELECTOR` are now named exports of `@client/utils/focus`, imported directly instead of through a composable call. Update every import from `@client/composables/useFocusManagement`:

  ```diff
  -import { useFocusManagement } from '@client/composables/useFocusManagement'
  -const { getFirstFocusable, getFirstFocusableAfter } = useFocusManagement()
  +import { getFirstFocusable, getFirstFocusableAfter } from '@client/utils/focus'
  ```

- **\[Architecture\]** Changed the product, basket, wishlist, category, search and navigation mappers to declare their own Storefront API `with` selections as `get` accessors, most of which `@scayle/storefront` made abstract. Two requests ask for more than before: search suggestions and search resolve ask for each category's sale property, and the variants of the PDP, the gift flow and each basket line's purchased variant ask for stock. Product and sibling images now ask only for the two image attributes the image mapping reads. PDP videos are requested as `videos: {}`, which sends the same request as `'all'` and asks for no video attributes or custom data.

  - `ProductMapperService` implements `Includes`, `DetailedIncludes`, `HreflangIncludes` and `VariantIncludes` as getters, replacing the `static readonly` constants and the `getIncludes()`, `getDetailedIncludes()` and `getHreflangIncludes()` methods. A protected `ImageIncludes` getter requests the `applyPadding` and `imageType` image attributes `mapImage` reads, for the product and sibling images of the listing and PDP includes. The CMS product sliders read `mappers.product.Includes` and the basket reads `mappers.product.VariantIncludes`, so a change to the product mapper's includes reaches them too. `MapperOverrides` retypes the `product` slot to `ProductMapperService` for `VariantIncludes`. If your shop reads one of the removed statics, read the getter from the registry slot instead. If your shop reads another image attribute, add its key to `ImageIncludes`.
  - `BasketMapperService.Includes` writes out the whole basket selection: the listing product includes for each line's product, and the product mapper's `VariantIncludes` for the variants the size selector offers and for the purchased variant. It replaces the `getVariantIncludes()` override. If your shop overrides `getVariantIncludes()`, move that selection into `Includes`.
  - `WishlistMapperService.Includes` returns the listing product includes for each wishlist line.
  - `CategoryMapperService.Includes` is the selection for the product listing page's category, and `CategoryMapperService.NavigationIncludes` the selection for the tree and list navigation, which asks only for the sale property.
  - `SearchMapperService.Includes` returns the listing product includes, and the parents and sale property of each category, for search suggestions and search resolve.
  - `NavigationMapperService.Includes` states the navigation selection the SDK default already requests: the category behind each category target.
  - `ListingProduct` no longer declares `breadcrumbs`. No mapper assigned it, since the listing includes request no categories, so analytics events for listing, wishlist and basket products always sent an empty `item_category` and still do. Categories are expensive for the Storefront API to resolve. If your analytics needs them on those events, request `categories` in `Includes` and map `breadcrumbs` in `mapProduct`.

  **\[Breaking\]** Code in your fork that reads or overrides the mapper selections no longer compiles. This affects code that reads `ProductMapperService.Includes`, `ProductMapperService.VariantIncludes`, `ProductMapperService.DetailedIncludes` or `ProductMapperService.HreflangIncludes` as static properties, code that overrides `getIncludes()`, `getDetailedIncludes()`, `getHreflangIncludes()` or `BasketMapperService.getVariantIncludes()`, and code that reads `ListingProduct.breadcrumbs`. TypeScript reports a missing property or an override of a member the base class no longer has. Read the selection from the mapper registry slot instead:

  ```diff
  -import { ProductMapperService } from '@server/services/mappers/product-mapper'
  -  with: ProductMapperService.Includes,
  +  with: context.mappers.product.Includes,
  ```

  Move a `getIncludes()`, `getDetailedIncludes()` or `getHreflangIncludes()` override into the getter of the same name without `get` and the parentheses, such as `public override get Includes(): ProductWith`. Move a `getVariantIncludes()` override into `BasketMapperService.Includes`. Remove reads of `ListingProduct.breadcrumbs`, since no mapper filled it.

- **\[Architecture\]** Migrated the account profile, account subscriptions, and subscription cancellation pages onto the class-based controller pattern. `AccountProfileController`, `AccountSubscriptionsController`, and `SubscriptionCancellationController` extend `BaseController` and mount via `mountController`, matching every other page controller. Their hand-rolled storefront and registry guards are gone: a missing storefront context or registry now throws and is caught by `createStorefrontErrorHandler` instead of rendering the 500 page from inside the handler. Both subscription pages return the 404 page from `beforeRender()` when the shop country does not set `subscriptionEnabled` in its `publicFields`.

  Renamed the `customerToken` prop of `AccountSubscriptions.vue` to `accessToken`, matching what every other page calls the value `getValidAccessToken()` returns. The `customer-token` attribute the subscription web component reads is unchanged. Only the page prop is renamed.

  Removed the `shopId` prop from `AccountSubscriptions.vue` and `SubscriptionCancellation.vue`. The subscription web components read the shop country id from Inertia shared props via `useStorefrontConfig()`, the same way the checkout web component does, so the value is no longer duplicated onto the page payload. A controller in your fork that renders these pages should stop sending `shopId`.

  Fixed the page titles on both subscription pages. `subscription.page.meta.title` and `subscription.cancellation.meta.title` are bare strings in every locale, so the shop name never reached the rendered title. Both controllers now add it through `withShopName`, like every other page, making the titles read `My Subscriptions | <shop name>` and `Cancel Subscription | <shop name>`.

  **\[Breaking\]** The `View` function exports of the three page controllers are gone, and `ssr-routes.ts` now mounts the controller classes with `mountController`. If your fork customized one of the old `View` handlers, move the change into `getViewProps()`, `beforeRender()`, or `getMeta()` of the matching controller class. A controller of your fork that renders `AccountSubscriptions.vue` must send `accessToken` instead of `customerToken` and stop sending `shopId`. A page that still receives `customerToken` renders without the subscription overview, because `AccountSubscriptions.vue` only mounts the web component when `accessToken` is set.

  ```diff
   return ctx.render('AccountSubscriptions', {
  -  customerToken,
  -  shopId,
  +  accessToken,
     apiBaseUrl,
     meta,
   })
  ```

- **\[Architecture\]** Changed the basket, sign-in, and product detail page controllers to read the session and query parameters from `this.request` instead of the Hono context, and removed the private `session` getter of `SignInController`. The account order detail page now builds its meta from the fetched order's id instead of parsing the `:id` route parameter a second time. The page controllers call `this.mappers.i18n` directly instead of copying it into a local variable first.

  Removed the `ServerContext` type. It was an alias of `SSRRenderContext`, so import `SSRRenderContext` from `@scayle/storefront` wherever `ServerContext` was used.

  **\[Breaking\]** `ServerContext` is no longer exported from `@server/types`. Code your fork added that imports it, such as a custom controller or a test, no longer compiles, and TypeScript reports a missing export:

  ```diff
  -import type { ServerContext } from '@server/types'
  +import type { SSRRenderContext } from '@scayle/storefront'
  ```

- **\[Architecture\]** Stopped `usePageMeta`, `useCheckoutWebComponent` and `useWishlist` from sharing module-level state between server requests. The state of `usePageMeta` and `useCheckoutWebComponent` is now written on the client only and returned read-only. `useWishlist` no longer keeps state at module level.

  - `usePageMeta().currentTitle` is now read-only. Set it through the new `setCurrentTitle`, which does nothing during a server render. Before, `PageMetaHead` wrote the title during every server render into state that all requests share.
  - `PageMetaHead` clears the title when it unmounts, so `currentTitle` is empty on a page that renders no `PageMetaHead`, such as the error page or a CMS page without meta, instead of holding the previous page's title. The route announcer skips the empty title.
  - `useCheckoutWebComponent().apiInitialized` is now read-only, and the auth API initialization does nothing during a server render.
  - `useWishlist` shares its in-flight toggles between mounted callers through `createSharedComposable` from `@vueuse/core` instead of a module-level map. Every call during a server render gets its own map, and the browser drops the map once no caller is mounted.

  **\[Breaking\]** Code that assigns `currentTitle.value` directly has to call `setCurrentTitle` instead. Typecheck fails on the assignment, and an assignment that slips through does nothing to a read-only ref at runtime.

  ```ts
  const { currentTitle, setCurrentTitle } = usePageMeta()

  // Before
  currentTitle.value = 'Shoes'
  // After
  setCurrentTitle('Shoes')
  ```

  The same goes for any code that assigns `useCheckoutWebComponent().apiInitialized`. The composable initializes the auth API itself on the client, so remove the assignment.

- **\[Architecture\]** Added an `i18n` slot to the mapper registry that holds the `ServerI18nService`. Mappers and controllers read `mappers.i18n` instead of creating their own translator, so a request builds one translator that every mapper shares. Only `mapperRegistry` creates a `ServerI18nService`. The slot lives in the mapper registry because mapper factories receive only `{ storefront, mappers }`.

  Removed `PageMetaMapperService`. Each page controller now builds its own head meta in a `getMeta` method and reads translations from `mappers.i18n`. Also removed the unused `RecentlyViewedService`. The recently viewed feature runs on the client and never used it.

  **\[Breaking\]** `ShopConfigMapperService` takes the `MapperRegistry` as a second constructor argument and reads `mappers.i18n`. A custom mapper that creates its own `ServerI18nService` has to do the same, and its registry factory has to pass `mappers`, for example `shopConfig: ({ storefront, mappers }) => new ShopConfigMapperService(storefront, mappers)`. If your fork customized a `PageMetaMapperService` builder, move that change into the `getMeta` method of the controller that renders the page.

- **\[Basket\]** Replaced the add-to-basket toast and the mini-basket flyout with a confirmation slide-in. Adding a product now opens a panel that stays until it is dismissed. It shows the added line (image, brand, name, size, color, quantity, final price and 30-day best price), `Go to Basket` and `Go to Checkout`, and a `Things you might like` section of six products. Desktop enters from the right. Mobile opens as a bottom sheet.

  The panel opens from `useBasket().addItem`, so it covers the product detail page and the gift-collection quick add. Recommendations come from the `trendingProducts` prop of the current page, which the product detail page already sends, so opening the panel costs no extra request. A page that sends none renders the confirmation without the section. The recommendations report to GA4 as the item list `add_to_basket_recommendations`.

  `addItem` no longer confirms an add the basket did not gain. When the user navigates away while the basket reloads, Inertia cancels the reload without an error. `addItem` then resolves `false`, announces nothing and reports no `add_to_basket` event. `partialReload` reports this case as `cancelled` on its resolved value, next to `error`, so any caller that treats the reloaded props as the result of its own mutation should check it.

  A slide-in or the mobile sidebar now stays open through a partial reload and through the prefetch of a `prefetch-on-press` link, and closes on a browser Back or Forward. `isPartialReload` in `utils/router.ts` decides this from `only`, `except`, `reset` and `prefetch`, and `useRouterEvent` is typed per Inertia event, so `before` callbacks receive a typed `event.detail.visit`. The `#header` slot of `SFSlideIn` now renders.

  **\[Breaking\]** The mini-basket flyout is gone, along with the success toast on add. Update your fork as follows:

  - `SFBasketPopoverActions`, `SFBasketPopoverCard` and `SFBasketPopoverItems` are deleted. Remove any import of or override for them.
  - The header basket link no longer takes `blockPopup`. The icon is a plain link to the basket on every viewport.
  - `addItem` opens the slide-in instead of showing a success toast. Error toasts are unchanged. Express checkout and basket quantity changes do not go through `addItem`.
  - The translation `basket_popover_actions.go_to_basket` moved to `basket.go_to_basket`. `basket_popover_items` and `basket.available_products` are removed.
  - A panel that passes the `#header` slot to `SFSlideIn` also needs `labelledBy`, pointing at a heading it renders, or `label`, used as the dialog's `aria-label`.

- **\[CMS\]** Replaced the block type chain in `StoryblokBlockDispatch`, `ContentfulBlockDispatch`, and `ContentstackBlockDispatch` with a `BLOCKS` table that pairs each block type with its component. The Amplience dispatcher follows the same pattern. Rendering is unchanged, with two small differences in Contentful. `RecentlyViewedProductsComponent` now renders inside a `Suspense` boundary like in the other providers, and a deleted reference, which reaches the dispatcher as `undefined`, no longer shows the development-only "not implemented" message.

  - Storyblok keys `BLOCKS` by each block's `component` value, and a missing or mismatched entry fails typecheck.
  - Contentful keeps `BLOCKS` as a list that pairs each generated `isType*` guard with its component, checked at compile time.
  - Contentstack keys `BLOCKS` by `_content_type_uid`. The generated types declare the uid as a plain `string`, so nothing checks that a key matches its component.

  To add a block, add an entry to `BLOCKS` and set `suspense: true` when its `setup` awaits at the top level or it is wrapped in `defineAsyncComponent`.

  The `contentElement` prop of the Storyblok `RecentlyViewedProductsComponent` now has its own block type instead of the full `StoryblokBlock` union, like every other Storyblok block component. `StoryblokBlockDispatch` already passes the matching block.

  **\[Breaking\]** If your fork edited a branch of the old chain in one of the three dispatchers, re-apply that edit as a `BLOCKS` entry. Code that passes the Storyblok `RecentlyViewedProductsComponent` a different block type now fails typecheck.

- **\[CMS\]** Added validation of the CMS credentials of the compiled-in provider when the production server boots. A missing or empty variable (for example `CONTENTFUL_CMS_SPACE`, `STORYBLOK_CMS_ACCESS_TOKEN`, or `AMPLIENCE_CMS_HUB_NAME`) stops the start with exit code 1 and an error that lists every problem at once, without printing any value. A deployment that boots today with a missing CMS credential and only serves pages without CMS content will refuse to start, so set the variables the error names. The build also rejects an empty or mistyped `CMS_PROVIDER` with a readable message. Forks that deleted the unused provider directories need no change. Under `pnpm dev` the server entry loads on the first request, so the error appears there.

  **\[Breaking\]** A production server that has a missing or empty credential for its CMS provider now exits with code 1 at boot. A deployment that runs today without that credential stops after you take this update, so set the variables the error lists before you deploy. If your fork added its own CMS provider under `src/server/cms/providers/`, two more changes are needed. Add the directory name to the `CMS_PROVIDER` list in `vite.config.ts`, or the build rejects it. Export a `parseCmsEnv` function from the provider's `service.ts`, because the server entry calls it at boot. A provider that needs no environment variables exports an empty function:

  ```ts
  export const parseCmsEnv = (): void => {}
  ```

- **\[CMS\]** Migrated the CMS pages (home, homepage, and content) to the class-based controller pattern. `CmsHomepageController` and `CmsContentController` replace the `renderCMSPage` and `View` functions and extend the new `BaseCMSPageController` from `@scayle/storefront`. `ssr-routes.ts` now mounts all three CMS routes via `mountController(...)` like every other page. The hand-rolled storefront and registry guard was removed. A missing context now throws into `createStorefrontErrorHandler` instead of rendering an inline 500 page.

  The `/content/:slug` route now rejects slugs that carry path segments with a 404 instead of passing them into the CMS provider request. Hono decodes percent-encoded characters in route params. The `/homepage` alias is now response-cached like `/`.

  **\[Breaking\]** `renderCMSPage` and `View` are no longer exported from the CMS page controller module. Your fork is affected if its own code imports them, for example a custom route that calls `renderCMSPage(ctx, SLUG)` or mounts `cmsPage.View`. TypeScript reports a missing export. Replace the handler with a controller class and mount it with `mountController`. For a route with its own slug, extend `BaseCMSPageController` from `@scayle/storefront/controllers`, implement `getSlug()`, `getTemplate()` and `getViewProps()` the way the abstract `CmsPageController` in the same module does, and mount that class. The homepage routes changed the same way.

  ```diff
  -ssrRouter.get(routes.content, cmsPage.View)
  +mountController(ssrRouter, routes.content, CmsContentController)
  ```

  To response-cache `/homepage` in your fork, add `[routes.homepage]: 600` to `cacheableRoutes` in `storefront.config.ts`.

- **\[CMS\]** Switched to the new `@scayle/storefront-cms-<provider>` packages instead of building the CMS provider through `CMSDataService` and `BaseCMSService` in `@scayle/storefront` core. The CMS service now registers as the `cms` slot on the `ServiceRegistry`. Controllers resolve it through `this.services.cms` or `ctx.get('services').cms` like every other domain, instead of constructing it directly. Each provider now reads its own dedicated access token environment variable instead of sharing `STOREFRONT_CMS_ACCESS_TOKEN`:

  - `@scayle/storefront-cms-storyblok`: `STORYBLOK_CMS_ACCESS_TOKEN`
  - `@scayle/storefront-cms-contentful`: `CONTENTFUL_CMS_ACCESS_TOKEN`, `CONTENTFUL_CMS_PREVIEW_ACCESS_TOKEN`
  - `@scayle/storefront-cms-contentstack`: `CONTENTSTACK_CMS_DELIVERY_TOKEN`

  If you updated a fork, change `.env` (or your deployment configuration) to the provider-specific token name for the CMS you have configured.

  **\[Breaking\]** `STOREFRONT_CMS_ACCESS_TOKEN` is no longer read. A fork that still sets only that variable gives its provider no token, so CMS requests fail until you set the provider-specific name. Rename it in `.env` and in your deployment configuration:

  ```diff
  -STOREFRONT_CMS_ACCESS_TOKEN=TOKEN
  +STORYBLOK_CMS_ACCESS_TOKEN=TOKEN
  ```

  The Storefront Application also removed `CMSDataService`, the `@shared/types/Cms` module, the per-provider `config.ts` files with the CSP settings (now part of the provider packages), and the CMS error helpers. Code in your fork that imports them no longer compiles. Import `CMSPageMeta`, `CMSEditorData`, `CMSPagePayload`, `CMSProviderService`, `CMSContentNotFoundError`, `extractErrorStatus` and `ensureError` from `@scayle/storefront/cms`:

  ```diff
  -import type { CMSEditorData, CMSPagePayload } from '@shared/types/Cms'
  +import type { CMSPagePayload } from '@scayle/storefront/cms'
  ```

- **\[CMS\]** Fixed three link bugs in the `RichTextComponent` of the Storyblok, Contentful, and Contentstack providers:

  - Internal links kept a country prefix the author had typed. On the default country with the `path_except_default` country selector, `/de/content/about` rendered as `/de/content/about` instead of `/content/about`, and `/de/de/content/about` in Storyblok lost only one prefix. With the `path` selector, a prefix typed by the author was doubled. All three providers now run internal links through the shared `normalizeCmsLink` helper, which strips every leading country prefix.
  - `mailto:` and `tel:` links in Contentstack were treated as internal paths and got a country prefix (`/de/mailto:a@b.com`). Contentstack now uses the same `isExternalLink` check as Contentful and Storyblok, so a link with a non-`http(s)` scheme passes through unchanged.
  - The shared `hasSafeLinkProtocol` check now ignores tabs and newlines inside a link, the way browsers parse a URL, so a `javascript:` link with a tab in the scheme is rejected like a plain one. DOMPurify already removed such links, so this only tightens the check that runs before it.

  **\[Breaking\]** The provider-local `normalizeInternalPath` helper of the Storyblok `RichTextComponent` was removed. If your fork calls it, pass the active `country` from `useStorefrontConfig` to `normalizeCmsLink` from `@client/cms/shared/links` instead.

- **\[CMS\]** Changed CMS page and listing fetches to pass the inbound `IncomingRequest` and no longer pass a locale.

  Controllers, shared data, and CMS middleware now call `fetchPageData(slug, request)` and `getCMSEditorData(request)` with `ctx.get('request')` or `this.request`. The CMS service takes the locale from the shop context it was constructed with. `cmsCspMiddleware` now resolves the CMS provider service instead of its CSP config directly, because CSP preview detection reuses `isEditorMode` instead of a separate `isPreviewRequest` check.

  **\[Breaking\]** `fetchPageData`, `fetchListingPageData`, `getCMSEditorData`, `isEditorMode` and `getPreviewRedirectPath` on the CMS service take the `IncomingRequest` instead of `ctx.req`, and the two fetch methods no longer take a locale. A call in your fork that still passes `ctx.req` or a locale fails type checking. Pass `ctx.get('request')` in middleware and `this.request` in controllers, for example `fetchPageData(slug, request)` instead of `fetchPageData(slug, locale, ctx.req)`:

  ```diff
   const content = await this.services.cms.fetchListingPageData(
     category.id,
  -  this.storefront.country.locale,
  -  this.ctx.req,
  +  this.request,
   )
  ```

  A custom CMS provider service in your fork must accept `IncomingRequest` from `@scayle/storefront/types` in these methods, drop the locale parameter, and remove `isPreviewRequest` from its `cspConfig`. A fork that builds its own `cmsCspMiddleware` resolver returns the CMS service instead of its `cspConfig`: `(ctx) => ctx.get('services')?.cms`.

- **\[CMS\]** Gave each CMS provider's page payload type under `src/shared/types/cms/<provider>/` the uniform name `CMSPageData` and removed its `[key: string]: unknown` index signature, so an object with an unexpected key is a compile error and the generated block unions narrow. Added the `@cms-shared` alias, which points at `src/shared/types/cms/<CMS_PROVIDER>/`. The provider-agnostic boundary files (`CmsPage.vue`, `ProductListing.vue`, the CMS page controller) import the payload from it instead of typing `pageData` as `Record<string, unknown>`. `pnpm typecheck` now also runs `vue-tsc` against a `tsconfig.<provider>.json` per CMS provider, so the page-to-provider payload boundary is verified for every provider instead of only the `scayle` placeholder.

  **\[Breaking\]** `StoryblokPageData`, `ContentfulPageData`, `ContentstackPageData` and `AmpliencePageData` no longer exist. Each is now `CMSPageData` in its `@shared/types/cms/<provider>` module. Your fork is affected if its own CMS code imports an old name, or reads or sets keys that the payload type does not declare, because the index signature is gone. TypeScript reports a missing export or an unknown property. Rename the import, use `CMSPageData` from `@cms-shared` in provider-agnostic code, and declare any custom key on `CMSPageData`.

  ```diff
  -import type { StoryblokPageData } from '@shared/types/cms/storyblok'
  +import type { CMSPageData } from '@shared/types/cms/storyblok'
   // unchanged code
  -  data: StoryblokPageData
  +  data: CMSPageData
  ```

- **\[CMS\]** Changed the CMS editor composables (`useContentfulEditor`, `useContentstackEditor`, `useStoryblokEditor`) to read `cmsEditorData` from the Inertia shared page props themselves instead of receiving a preview flag from their caller. The server sets that prop only for editor requests, so its presence is the editor-session signal.

  As a result, the `isCmsPreview` prop is gone from every provider's `PageComponent.vue` and `ProductListingPageComponent.vue`, and `CmsPage.vue` and `ProductListing.vue` no longer read `usePage().props.cmsEditorData` to thread a boolean down the component tree. If your fork passes `isCmsPreview` to a provider component or to one of the editor composables, drop the argument. Those consumers pick up the editor session on their own now.

  **\[Breaking\]** Your fork is affected when it has its own CMS provider component that declares `isCmsPreview` as a prop, or when it calls `useContentfulEditor`, `useContentstackEditor`, or `useStoryblokEditor` with the second argument. `CmsPage.vue` and `ProductListing.vue` no longer pass `isCmsPreview`, so a component that still reads it gets `undefined` and the live preview stops updating. A call with the extra argument fails typecheck. Remove the prop and the argument, as in the Contentful `PageComponent.vue`:

  ```diff
  -const { data, isCmsPreview } = defineProps<{
  +const { data } = defineProps<{
     data: ContentfulPageData
  -  isCmsPreview?: boolean
   }>()

  -useContentfulEditor(pageData, !!isCmsPreview)
  +useContentfulEditor(pageData)
  ```

- **\[Config\]** Moved each country's currency in `storefront.config.ts` to the object form `@scayle/storefront` now expects, `currency: { currencyCode: 'EUR' }`, and read the currency code from `country.currency.currencyCode` wherever the Storefront Application needs it. To change how prices render for a country, set `fractionDigits` or `display` next to the code.

  Removed the `currencyFractionDigits` field from the application's `PublicCountryFields` augmentation. If your fork sets it on a country, move the value to `currency.fractionDigits`.

  **\[Breaking\]** A string `currency` on a country in `storefront.config.ts` no longer matches the `CurrencyConfig` type that `@scayle/storefront` expects, and TypeScript reports an error there. Custom code in your fork that reads `country.currency` as a string now receives an object, and TypeScript reports those reads too. Change the config and the reads:

  ```diff
  -      currency: 'EUR',
  +      currency: {
  +        currencyCode: 'EUR',
  +      },
  ```

  ```diff
  -          shop_currency: storefront.country.currency,
  +          shop_currency: storefront.country.currency.currencyCode,
  ```

- **\[Config\]** Made `countrySelector` env-driven via `STOREFRONT_COUNTRY_SELECTOR` in the Storefront Application V3, defaulting to `path` when unset. This lets each environment use its own routing variant, for example `path_except_default`, without forking the config file. Existing deploys that previously relied on the hardcoded `path_except_default` value must set `STOREFRONT_COUNTRY_SELECTOR=path_except_default` to preserve their current routing.

  **\[Breaking\]** The default country routing changed from `path_except_default` to `path`. A fork that merges this release without setting `STOREFRONT_COUNTRY_SELECTOR` stops serving its default country without a path prefix. Every country URL gets a prefix such as `/en` instead. Set the variable in every environment that should keep the old URLs:

  ```diff
  +STOREFRONT_COUNTRY_SELECTOR=path_except_default
  ```

  If your `storefront.config.ts` hardcodes `countrySelector`, keep your own value when you resolve the merge.

- **\[Config\]** Read `tenantSpace`, `shopKey`, and each country's `shopCountryId` from the environment instead of hardcoding them in `storefront.config.ts`. Reorganized `.env.example` so it is ordered by what you have to set. Shop credentials come first in a `### SHOP ###` section, which merges the former `### OAUTH ###` and `### STOREFRONT APPLICATION ###` sections. Countries follow in `### COUNTRIES ###`, renamed from `### CHECKOUT ###` because it already held a non-checkout variable, and each country block now leads with its shop country ID. Routing, CMS, and the optional infrastructure settings come next, with local development values last.

  Four variables are removed because no code reads them: `STOREFRONT_REDIRECTS_ENABLED`, `STOREFRONT_REDIRECTS_QUERY_PARAM_ALLOWLIST`, `STOREFRONT_REDIS_URL`, and `STOREFRONT_COUNTRIES_US_CURRENCY_FRACTION_DIGITS`. The storage driver reads `SCAYLE_KV_HOST`, `SCAYLE_KV_PORT`, `SCAYLE_KV_TLS`, `SCAYLE_KV_USER`, `SCAYLE_KV_PASSWORD`, and `SCAYLE_KV_BASE` instead, so a fork that set `STOREFRONT_REDIS_URL` was still using `localhost:6379`.

  Playwright configuration moves to `testing/playwright/.env.example`, next to the tests that use it. `playwright.config.ts` loads that file before the application `.env`, so a key set in both resolves to the E2E value.

  **\[Breaking\]** The application no longer starts unless these five variables are set in every environment, because the configuration schema rejects the empty values:

  - `STOREFRONT_TENANT_SPACE`
  - `STOREFRONT_SHOP_KEY`
  - `STOREFRONT_COUNTRIES_DE_SHOP_COUNTRY_ID`
  - `STOREFRONT_COUNTRIES_US_SHOP_COUNTRY_ID`
  - `STOREFRONT_COUNTRIES_AT_SHOP_COUNTRY_ID`

  Add them to your `.env` file. `pnpx @scayle/storefront-cli setup` creates `.env` from `.env.example` and asks for the values it cannot fetch. In production they come from the container environment, since the dotenv file is only loaded in dev.

  If you run end-to-end tests, copy `testing/playwright/.env.example` to `testing/playwright/.env` and move your existing E2E values there. Values kept in the root `.env` are still read.

- **\[Country Detection\]** Changed the country switch prompt to detect the user's country on the server from the `CF-IPCountry` header that Cloudflare sets, instead of guessing in the browser from the timezone and `navigator.language`. The shop switcher renders the same links and labels as before.

  For a project that forked the Storefront Application:

  - `registries.ts` now registers the new `country` slot with `CountryService`, and the `sharedData` middleware serves `availableCountries` and `availableLanguages` from it.
  - The prompt only opens when a shop serves the user's country. It no longer offers the default shop to a user from a country without one, since the default shop is a routing setting and serves that user no better than the shop they are on.
  - A new deferred `shopSuggestion` shared prop carries `{ region, languages }`, or `null` when there is nothing to suggest. It is deferred so a cached page response never contains the country of the user who filled the cache.
  - For local development, set `STOREFRONT_DETECTED_COUNTRY` (documented in `.env.example`) to stand in for the header. It only applies in development mode. The Playwright country detector spec now sends the `CF-IPCountry` header instead of emulating a timezone. It skips unless `BASE_URL` is local, because Cloudflare overwrites that header.
  - `useCountryDetection` no longer detects on mount, reads `storefront.config.countries`, or calls SDK helpers. It reads `shopSuggestion` from the page props and applies the browser gates: the customer resolved as signed out, not prompted yet, and no shop switch in this tab session.
  - The `availableCountries` and `availableLanguages` prop types are narrower. They no longer carry every country config field, only what the switcher renders.
  - The signed-out check now waits for the deferred `customer` prop to resolve (`customer === null`). It previously read the prop at mount, before it had loaded, so a customer could see the prompt.

  **\[Breaking\]** The prompt now depends on the `CF-IPCountry` header. A deployment that does not run behind Cloudflare never receives it, so the prompt never opens there. `useCountryDetection` returns different values as well. `suggestedShops` holds `AvailableLanguage` items instead of `StorefrontCountryWithUrl` items, and the composable no longer calls `getCurrentCountryFromTimezone` or `evaluateShopRedirectSuggestion`. Components in your fork that read `suggestedShops`, `detectedRegion` or `suggestionActive` need to match the new types, and TypeScript reports the mismatch. If your fork keeps its own `registries.ts`, register the `country` slot, because the `sharedData` middleware reads it:

  ```diff
  +  country: ({ storefront, request }) => new CountryService(storefront, request),
  ```

- **\[Country Detection\]** Added a Stay button and per-language buttons to the country detection modal.

  The modal now has a Stay button and one button per language when the detected country has several. It is limited to 480px width and keeps a margin to the screen edge on smaller screens.

  Changed the `country_detection` translation keys. Country names are now passed as the `detectedCountry` and `currentCountry` variables:

  - `switch_country_prompt` is now `headline`.
  - `current_shop_prefix` is now `subline_single_language` and `subline_multi_language`.
  - `country_with_language` was removed, since language buttons now show the language's own name.
  - `shop_in_country` and `stay_in_country` are new.

  Also changed the test IDs. Projects with their own Playwright specs should update them accordingly:

  - Language buttons append the language code: `country-detection-switch-ch-fr` instead of `country-detection-switch-ch`. A single-language country keeps `country-detection-switch-<country>`.
  - `country-detection-stay` is new, for the Stay button.

  **\[Breaking\]** Your fork is affected if it keeps its own `country_detection` translations or Playwright specs for the country detection modal. The old translation keys no longer exist, so the modal shows a missing-key text where your fork still carries only the old keys. A spec that clicks `country-detection-switch-ch` for a country with several languages times out, because the test ID now carries the language code. Rename your translation keys and pass the two new variables, then update the test IDs in your specs:

  ```diff
  -    "switch_country_prompt": "Looks like you are in {country}. Which shop would you like to visit?",
  +    "headline": "Looks like you're in {detectedCountry}",
  -    "current_shop_prefix": "You are currently shopping in {country}.",
  +    "subline_single_language": "You're shopping in {currentCountry}. Prices, delivery and payment options may differ by country.",
  ```

- **\[E2E\]** Changed the Playwright suite to resolve every URL relative to `BASE_URL`, which now holds the origin and the country prefix of the shop under test with a trailing slash, for example `https://localhost:3000/de/`. That is also the default when `BASE_URL` is unset. The suite also reads listing filters from the parsed URL query, because listing URLs percent-encode the brackets of `filters[...]` and the price, color and size filter assertions timed out.

  **\[Breaking\]** Forks that keep the Playwright suite have to adapt their environment and specs.

  - Rename `TEST_USER_EMAIL1` through `TEST_USER_EMAIL6`, `TEST_USER_PASSWORD`, `TEST_USER_WRONG_PASSWORD` and `TEST_USER_NO_ORDERS` to the matching `TEST_CUSTOMER_*` names (`TEST_CUSTOMER_EMAIL1` through `TEST_CUSTOMER_EMAIL6` and so on) in your `.env` and CI variables. The suite no longer reads the old names.
  - The suite builds its Storefront API host from `STOREFRONT_TENANT_SPACE` and authenticates with `STOREFRONT_API_KEY`. `STOREFRONT_SAPI_HOST` and `STOREFRONT_SAPI_TOKEN` are no longer read.
  - Set `BASE_URL` with the country prefix and no query string or hash. The config throws when it has either. A bare origin such as `https://shop.example.com` makes the homepage URL assertions fail when your shop redirects to a country.
  - In your own specs, `TEST_USERS` is now `TEST_CUSTOMERS`, `USER_ACCOUNT` is `CUSTOMER_ACCOUNT` with the keys `firstName`, `lastName` and `birthDateIncorrect`, and `getUserForBrowser` is `getCustomerForBrowser`. `ROUTES.homepageDefault`, `ROUTES.homepage1` and `SIGNIN_URL` are removed, use `ROUTES.home` and `ROUTES.signin`.
  - Paths in `ROUTES`, `CUSTOMER_ACCOUNT` and `OSP_TEST_DATA`, and the result of `storefrontAPIClient.getCategoryPath`, no longer start with a slash. Pass them as they are to `page.goto`, and write `/${ROUTES.basket}` where a URL assertion needs the slash. A path that starts with `/` skips the country prefix, so an ESLint rule in the suite rejects a literal leading-slash path in `goto`, `navigate`, `toHaveURL` and `waitForURL`. It does not check a path held in a variable.
  - Take the homepage URL from `getHomepageUrl(baseURL)`, which `BasketPage.assertContinueButton` now expects as its argument.
  - If your specs wait for a filter in the URL with a regular expression or `toContain`, compare `url.searchParams.get('filters[minPrice]')` instead.

- **\[Error Handling\]** Fixed a basket, promotion code or profile change showing its success toast next to the global error toast when the reload after the change failed, while the page kept showing the old data. `partialReload` never reported a server error or a network failure, so the change looked successful. It now sets `error` for both.

  After a failed reload the global error toast is the only message. `useBasket` (add, quantity change, size change, remove), `usePromotionCode`, the wishlist toggle in `useWishlist` and the personal information form on the profile page show no toast of their own, and the basket page announces no failure to screen readers. The network error toast now has the same Reload link as the server error toast, so both show whether the change went through.

  **\[Breaking\]** `useBasket().removeItem` now resolves to `{ success }` instead of a boolean, like `changeItemVariant`, and both set `reloadFailed` when the failure came from the reload. An object is always truthy, so a component of your own that checks the old boolean still compiles but treats every failed removal as a success. Read `success` instead:

  ```diff
  -const success = await removeItem({ itemKey })
  -if (success && item) {
  +const result = await removeItem({ itemKey })
  +if (result.success && item) {
  ```

  `ReloadError` is now the error response (`HttpExceptionResponse`) or the network `Error`, no longer the validation errors object that Inertia passes to `onError`. If your shop calls `partialReload` after its own mutation, `error` is now set when the reload fails, and the global error toast has already reported it. Skip that mutation's own message when `error` is set.

- **\[Error Handling\]** The 404 page now renders through the `@scayle/storefront` not-found handler. The server entry registers `app.notFound(createStorefrontNotFoundHandler())`, which renders `NotFound` for every unmatched route and every `ctx.notFound()` call.

  - Removed `notFound.ts` from the server utilities, together with the `renderNotFound()` overrides on the product detail, product listing, search, CMS page and account order detail controllers, which now use the SDK default.
  - Removed the catch-all `ssrRouter.all('/*', …)` route. Unmatched paths reach the not-found handler instead.
  - `NotFound.vue` takes no props. It builds its own head with the title "Page not found." and `noindex, nofollow`, so the title no longer carries the shop name and a 404 no longer fetches the shop configuration. Removed the unused `error.page_not_found_meta` translation key from every locale.
  - To change the 404 response for the whole Storefront Application, replace the handler in the server entry. To change it for one page, override `renderNotFound()` on that page's controller.

  **\[Breaking\]** Your fork is affected if it imports `renderNotFound` or `errorPageMetaWithoutStorefront` from the removed `notFound.ts`, calls `ctx.render('NotFound', ...)`, passes `meta` or `code` to `NotFound`, reads the removed `error.page_not_found_meta` key, or keeps its own catch-all route. `NotFound` is no longer in the `Components` registry in `global.d.ts`. TypeScript reports a missing module or an unknown page name, and the removed key renders as its raw name. Register the SDK handler in the server entry, because without a catch-all and without the handler, unmatched paths get Hono's plain-text 404. Delete controller overrides that only called the removed helper.

  ```diff
   app.onError(createStorefrontErrorHandler())
  +app.notFound(createStorefrontNotFoundHandler())

  -// Catch-all: render 404 for any unmatched route
  -ssrRouter.all('/*', async (ctx) => renderNotFound(ctx))

  -  protected override renderNotFound(): Promise<Response> {
  -    return renderNotFound(this.ctx)
  -  }
  ```

- **\[Filters\]** Changed listing filters to write one query parameter per selected value, so a search provider's facet text survives a page, sort or filter change. Sort, pagination, the PDP variant link and `useFilter` now build their URLs with `URLSearchParams`.

  `useFilter` passes `useRoute().query` to the `@scayle/storefront` query helpers, which now take and return `URLSearchParams`, and resets all filters with the new `getClearedFiltersQuery`. The range filters in its `RANGE_FILTERS` table name the helper that writes their bounds.

  Filter URLs are serialized by `URLSearchParams`, so brackets and commas are percent-encoded. A listing link now carries `%5B`, `%5D` and `%2C` where it used to carry `[`, `]` and `,`. The encoding changes nothing on read, because the same URL written unencoded parses to the same two values.

  A filter value's id is text throughout, so `SFFilterSlideInContent` emits `applyAttributeFilter` with a `string` and `useFilter` takes one.

  A listing URL written against the previous release keeps its comma-joined values (`filters[color]=18,2275`), which now read as one value. The products stay filtered by both colors, because the Storefront API receives the same `filters[color]=18,2275` either way. The filter UI does not match. No swatch shows as selected, the filter badge counts one value, and clicking one of the two colors appends it instead of removing it, so only resetting the filter group clears the selection.

  **\[Breaking\]** `useRoute().query` is now a `URLSearchParams` rather than a `Record<string, string>`. Read a single value with `query.value.get('page')`, a repeated one with `getAll`, and copy it before building a new URL. `toQueryString` was removed from `@scayle/storefront`, so serialize queries with `URLSearchParams` instead. A filter value id is a `string` instead of a `number`, so code that declares or passes a `number` to the `applyAttributeFilter` event of `SFFilterSlideInContent` or to `applyAttributeFilter` of `useFilter` fails typecheck. Code in your fork that reads `useRoute().query` as an object, or builds a query string by hand, needs the same change as `useFilter` made:

  ```diff
  -  const sort = ref(query.value.sort)
  +  const sort = ref(query.value.get('sort'))
  -    const { page, ...queryWithoutPage } = query
  -    const queryString = toQueryString(queryWithoutPage)
  +    const nextQuery = new URLSearchParams(query)
  +    nextQuery.delete('page')
  +    const queryString = nextQuery.toString()
  ```

- **\[Filters\]** Moved the color attribute filter chip color mapping from the server to the client. The product listing mapper now passes the raw color attribute value through unchanged, and `SFFilterSlideInContent` looks up the swatch color and its contrast from a typed `FILTER_COLORS` table in the client constants. Removed the server-side `FilterColor` and `isBrightProductColor` tables, the `ColorFilterValue` shared type, and the `--color-product-filter-*` CSS variables that tied the server to the client's design system.

  **\[Breaking\]** If your fork added or changed a color in the server `FilterColor` or `isBrightProductColor` table, or in the `--color-product-filter-*` variables, that change no longer reaches the filter, because the mapper now passes the raw color attribute value through. `SFFilterSlideInContent` reads `FILTER_COLORS` in the client constants, keyed by that raw value, and a value without an entry renders a plain gray swatch. Move each of your colors into `FILTER_COLORS`. `color` takes one hex string or an array for a multi-color swatch, and `showBorder` replaces `isBrightColor` as the contrast flag. Code in your fork that read `isBrightColor` from a color filter value, or used its `value` as a CSS class, has to look the color up in `FILTER_COLORS` instead:

  ```ts
  export const FILTER_COLORS = {
    weiss_1: { color: '#ffffff', showBorder: true, showBlackCheckMark: true },
    COLOR_ATTRIBUTE_VALUE: { color: '#HEXCOLOR' },
  }
  ```

  The `ColorFilterValue` and `FilterValue` types were removed, so code that imports them fails typecheck. Use `AttributeFilterValue`, which is now the type of every value of an attribute filter.

- **\[i18n\]** Every locale file in the `locales` folder is now used, and the browser downloads only the active shop's messages.

  **\[Breaking\]** `createI18nInstance(locale, messages)` now takes the messages keyed by locale, and the `messages` export of `config.ts` is removed. If your project calls `createI18nInstance` directly, pass `{ [locale]: getLocaleMessages(locale) }` from `messagesServer.ts`. Code that read `messages` now reads `localeMessages` from the same file. Before you upgrade, also check that every locale in `storefront.config.ts` has a file in the `locales` folder. The setup CLI creates one per shop locale, so a fork made with it already has them.

  - Before, only `en_US.json` and `de_DE.json` were registered, and both shipped in the entry chunk to every user. A shop with any other locale rendered German. A shop locale now picks the file named after it, else `de_DE.json`, and logs a warning the first time a locale falls back. The `de-AT` shop gets its own `de_AT.json`, a copy of `de_DE.json`.
  - `main.ts` and `ssr.ts` now read the active locale through the new `getPageLocale` in `config.ts`, so both entries resolve the same one. If you changed how either entry picks the locale, move that change into `getPageLocale`.
  - The client build now emits one chunk per locale file, and the entry chunk carries no messages. `main.ts` loads the active locale's chunk and mounts once it has loaded, so hydration renders the same text as the server.
  - `ssr.ts` now reports the active locale file in `modules`, and the new `preloadModules` option in `vite.config.ts` keeps it in the SSR manifest. Each page therefore carries a `modulepreload` hint for its locale chunk, and the browser fetches it in parallel with the entry chunk. This needs the `@scayle/storefront-build` release that adds `preloadModules`. With an older one, `vite.config.ts` fails typecheck and pages lose the hint.
  - The server bundles every locale file through `messagesServer.ts`, and the browser loads its chunk through `messagesBrowser.ts`. Import `messagesServer.ts` only from server code, the SSR entry, Storybook or tests. Imported from client code, it puts every locale back into the client bundle, so a new `no-restricted-imports` pattern in `eslint.config.mjs` rejects it in `src/client/` (except `ssr.ts`) and `src/shared/`.
  - The Storybook locale toolbar now lists every locale.

- **\[Images\]** Removed the duplicated single-image fields so the Storefront API image order is the only source.

  `ListingProduct.image` duplicated `images[0]`, which left components split between the two fields. It is gone from the `@scayle/storefront/types` augmentation, and every consumer (product card, basket card, sibling pickers, JSON-LD) now reads `images[0]`. Basket and wishlist lines carry a full listing product, so the payload loses a duplicated image per line.

  `SFProductSuggestion.vue` follows the removal of `SearchProductSuggestion.image` in `@scayle/storefront` and reads `suggestion.product.images[0]`.

  The `mapImage` server helper no longer sets `isPrimary`, following the removal of the primary-image signal from `@scayle/storefront`.

  Removed the unused `ATTRIBUTE_KEY_PRIMARY_IMAGE_TYPE` constant. It described the V2 model-versus-packshot signal, which was never connected in this application.

  **\[Breaking\]** Replace reads of `ListingProduct.image` and `SearchProductSuggestion.image` with `images[0]`, and stop reading `isPrimary` from the output of `mapImage`.

- **\[Images\]** Changed `SFProductImage` and `SFProductThumbnail` to inherit the `'lazy'` default that `SFProductImageBase` documents, instead of re-defaulting `imageLoading` to `'eager'`. Every call site that passed nothing now states its own hint, so the rendered output is unchanged except in two places. The order success thumbnails load eagerly instead of lazily, since the first one is an LCP candidate, and the hidden breakpoint duplicate in the gift promotion modal is no longer downloaded. The `ImageLoading` type now lives in `@client/constants`, and `useLcpPriority` keeps re-exporting it. A fork that renders either wrapper without `imageLoading` now gets `'lazy'` and should pass `'eager'` where the image sits in the initial viewport.

  **\[Breaking\]** The default of `imageLoading` on `SFProductImage` and `SFProductThumbnail` changed from `'eager'` to `'lazy'`. Your fork is affected if its own code renders either component without `imageLoading`. No error appears. Images in the initial viewport start loading later, which can slow the Largest Contentful Paint. Pass `image-loading="eager"` on every image that is visible without scrolling.

  ```diff
           :apply-padding="productImage.applyPadding"
  +        image-loading="eager"
           class="overflow-hidden rounded-lg"
  ```

- **\[Images\]** Added support for an `applyPadding` image attribute. Product images that carry it render their container with padding, so trimmed assets that are cropped tight to the product no longer sit flush against their frame. `mapImage` reads the attribute from the Storefront API image attributes and sets `applyPadding` on `ProductImage`.

  SCAYLE has no boolean attribute type, so the attribute is an image-level group of type `simple` and its presence counts as true. `SFProductImage` and `SFProductImageBase` take a `paddingSize` prop for the amount, either `'default'` (`p-4`) or `'compact'` (`p-1`). Swatch-sized frames are too small for the default step, so the siblings picker on product cards and `SFProductThumbnail`, which the sibling selector on the product detail page uses, always pad with `'compact'`. The sibling swatch on the product detail page also uses the shared product image background instead of white.

  **\[Breaking\]** `ProductImage` has a required `applyPadding: boolean` field. `mapImage` sets it, so images mapped by the Storefront Application need no change. Your fork is affected if it builds `ProductImage` objects itself, for example in a custom mapper that skips `mapImage`, in test fixtures, mock data or stories. TypeScript then reports that `applyPadding` is missing. Add `applyPadding: false` to those objects.

- **\[Images\]** Unified the remaining product image components on the `url` and `preset` contract. `ImageSliderImage` now carries the server-shipped image `url` and a responsive `preset` instead of pre-built `src`, `srcSet` and `sizes` strings, and `SFImageGallery`, `SFImageStrip`, and their product call sites build the responsive variant on the client. `SFProductThumbnail` accepts `url` and `preset` like `SFProductImage`, so `SFSiblingSelection` no longer builds thumbnail variants itself, and `SFProductCardSiblingsPicker` renders swatches via `preset="swatch"` instead of inline variant building. Rendered image attributes are unchanged.

  **\[Breaking\]** `ImageSliderImage` from `@client/utils/constants` lost its optional `src`, `srcSet` and `sizes` fields and now requires `url` and `preset`. Your fork is affected if it builds `ImageSliderImage` objects with the old fields, for example for `SFImageGallery` or `SFImageStrip`, or if a `#slide` slot template reads `image.src`. TypeScript reports that `url` and `preset` are missing. Without type checking, the slides render no image. Pass the image `url` and the preset name that you gave `buildImageVariant` before, and drop the variant building.

  Before:

  ```ts
  const variant = buildImageVariant(productImage.url, IMAGE_VARIANTS.detail)
  return {
    src: variant.src,
    srcSet: variant.srcSet,
    sizes: variant.sizes,
    // alt, hash, applyPadding
  }
  ```

  After:

  ```ts
  return {
    url: productImage.url,
    preset: 'detail' as const,
    // alt, hash, applyPadding
  }
  ```

- **\[Navigation\]** Removed the "Find a Store" link from the mobile navigation sidebar. The Storefront Application has no omnichannel integration, so the link was non-functional. Also removed the unused `routes.location` entry, the `navigation.find_a_store` i18n key across all locales, and the associated Playwright page object and fixture.

  **\[Breaking\]** `routes.location`, the `navigation.find_a_store` translation key and the Playwright `storeLocator` fixture were removed. The Storefront Application never mounted a `/location` page, so only the mobile navigation link used them. Your fork is affected if it built its own store locator on `routes.location` or on the translation key, or if its end-to-end tests request the `storeLocator` fixture. You notice a TypeScript error on `routes.location`, a missing translation, or an end-to-end test that fails on the fixture. Add `location: '/location'` back to `routes` and the `navigation.find_a_store` key back to every locale file, and restore the page object from your fork's git history.

- **\[Orders\]** Added `addressLinesMatch`, which reports whether two order addresses render the same lines. `SFOrderSuccessAddressInfo` and `SFOrderDetailBaseInformation` use it to decide between one merged delivery-and-billing box and a box for each. It replaces the removed `OrderAddresses.isSameAddress` flag. The flag compared the raw address records, so it counted the address id and the `isBillingAddress` and `isShippingAddress` flags as differences even though none of them reaches the page. Comparing the rendered lines matches what those components show.

  **\[Breaking\]** The `order` service-registry factory in `registries.ts` now passes the inbound request. `OrderService` needs it for the bearer-authenticated order lookups it took over from `CustomerService`. If your fork has its own `order` entry in `registries.ts`, add the request as the third argument, as in the lines below. Without it, typecheck fails against the new `OrderService` constructor.

  ```diff
  -  order: ({ storefront, mappers }) => new OrderService(storefront, mappers),
  +  order: ({ storefront, mappers, request }) =>
  +    new OrderService(storefront, mappers, request),
  ```

  The `isSameAddress` flag is gone from `OrderAddresses` too. Code in your fork that reads it, in an order success or order detail component for example, should call `addressLinesMatch(order.address.shipping, order.address.billing)` from `@client/utils/address`.

- **\[Performance\]** A stalled upstream call now fails after 3 s instead of holding the page. `createOutboundDispatcher()` returns the process-wide dispatcher for the global `fetch`. It waits at most 3 s for response headers and at most 3 s between two body chunks, connects within 5 s, keeps idle sockets alive for 30 s and opens at most 32 connections per origin. The limits apply to every call through the global `fetch`: Storefront API, Checkout API, Storyblok and the S3 sitemap source. Contentful, Contentstack, Amplience and Constructor use their own HTTP clients and keep their own limits. A stall on secondary data such as navigation, attribute groups or CMS content now renders the page without that part after about 3.5 s, and a stall on the main entity answers 500 after about 3.5 s.

  The dispatcher is an `EnvHttpProxyAgent`, so outbound `fetch` honors `HTTP_PROXY`, `HTTPS_PROXY` and `NO_PROXY`. A deployment that sets them sends Storefront API and Checkout traffic through that proxy. Without them, requests go out directly.

  **\[Breaking\]** The limits are tighter than before. The Storefront Application used to wait up to 10 s for response headers and 30 s between body chunks, and now both limits are 3 s. Your fork is affected if an origin it calls through the global `fetch` can legitimately take longer than 3 s, for example an integration you added. The call then fails after about 3 s, so the page renders without that part, or answers 500 when it was the main entity. The dispatcher also moved out of the server entry into its own module as `createOutboundDispatcher`, which the server entry registers. A fork that tuned the pool values in the server entry carries them over to that module. To raise the limit, pass milliseconds to `createOutboundDispatcher`. The value sets both the headers limit and the body limit.

  ```diff
  -setGlobalDispatcher(createOutboundDispatcher())
  +setGlobalDispatcher(createOutboundDispatcher(10_000))
  ```

- **\[Performance\]** Moved panels that stay closed until a user opens them out of the server-rendered HTML and out of the JavaScript a page loads up front. They now load and render on the first open, through a new `useOverlay` composable modeled on Nuxt UI's. This covers the filter slide-in on the PLP and the search page, the promotion slide-in, the shop switcher, the mobile navigation sidebar, the country detection modal and the price information modal.

  **\[Breaking\]** Several component APIs changed. If your fork uses or overrides these components, update it as follows.

  - `useOverlay().create(() => import('./SFPanel.vue'), { props: () => ({ ... }) })` returns `open`, `close`, `toggle`, `isOpen` and `triggerAttrs`. `open()` loads the component on its first call. Bind `triggerAttrs` on the button that opens the panel: it sets `aria-expanded`, sets `aria-controls` only once the panel is in the DOM, sets `aria-busy` while the first open loads, and starts the download on hover or focus. The triggers show the load with a pulse, or with lowered opacity when the user prefers reduced motion. See the "Overlays" section of the client `CLAUDE.md`.
  - `main.ts` and `ssr.ts` install the new `createOverlayPlugin()` and render `SFOverlayHost` next to the Inertia `App`. If you changed either entry's `setup`, add both.
  - The composable that `SFModal` and `SFSlideIn` share for scroll lock, backdrop clicks and Escape is renamed from `useOverlay` to `useDialogBehavior`. Update imports in components you built on it.
  - An overlay component has an `open` model. These components renamed theirs: `SFFilterSlideIn` and `SFPromotionSlideIn` (`v-model:is-open` is now `v-model:open`), `SFPriceInfoModal` (`v-model:visible` is now `v-model:open`), and `SFMobileSidebar` (the `isOpen` prop is now `open`).
  - `ProductListing.vue` and `Search.vue` create the filter slide-in as an overlay instead of rendering `SFFilterSlideIn`. `SFFilterToggleButton` no longer takes `isOpen` and `controlsId`. The pages bind the overlay's `triggerAttrs` on it.
  - `SFPromotionModalButton` opens the promotion slide-in itself and no longer emits `open`. `SFHeader` no longer emits `openPromotionModal`, and `Layout.vue` no longer renders `SFPromotionSlideIn`.
  - The mobile sidebar is shared through the new `useMobileSidebar()`. `SFHeader` no longer has the `isMobileSidebarOpen` model, and `Layout.vue` reads the open state from `useMobileSidebar()` to hide the promotion ribbon. `SFMobileSidebar` now owns its popover, slide transition and scroll lock, which were in `SFHeader`. It takes the menu toggle as `toggleElement`, which `SFHeader` binds to the `menuToggle` ref of `useMobileSidebar()`, and shows its popover with the toggle as the source, so the sidebar still follows the toggle in the keyboard order. `v-popover` accepts `{ open, source }` for this, next to a boolean. Below the `lg` breakpoint its code loads once the browser is idle after the page has mounted. The category links crawlers follow stay in the server-rendered HTML through the desktop navigation.
  - The shop switcher dialog moved from `SFShopSwitcher` into the new `SFShopSwitcherSlideIn`, opened through `useShopSwitcherSlideIn()`. The header and the sidebar trigger now open the same dialog instead of one each.
  - `SFCountryDetection` no longer opens itself. `Layout.vue` opens it when a shop suggestion applies, so it no longer renders `<SFCountryDetection />`. The component has an `open` model.
  - A clickable `SFProductPrice` renders its price row through the new `SFPriceInfoButton`, which creates the `SFPriceInfoModal` overlay. A clickable price no longer mounts a modal until it is clicked, and a price that is not clickable creates no overlay. The info icon and its screen reader label moved into `SFPriceInfoButton`.
  - `SFSearchField` loads `SFSearchResultsContainer` with `defineAsyncComponent`, so the search suggestions are no longer part of the JavaScript a page loads up front. Their code loads once the suggestions first open.
  - `SFButton` passes a caller's `aria-busy` through instead of overriding it.
  - Component tests that mount a component calling `useOverlay()` need the plugin. `createOverlayTestPlugin()` from the `overlay` test utility provides it and exposes the created overlays and their props. Storybook installs the plugin and renders `SFOverlayHost` in `.storybook/preview.ts`.
  - The e2e page objects find the filter and promotion close buttons inside their own slide-in (`filter-slide-in`, `promotion-slide-in`) instead of by position, and find the shop switcher dialog outside the trigger.

- **\[Product\]** Populated the new `name` field on mapped product images (PDP, PLP, and order line items) through `mapImage`.

  **\[Breaking\]** `ProductImage` has a required `name` field, the non-localized file name of the image. `mapImage` sets it from the Storefront API image, so images mapped by the Storefront Application need no change. Your fork is affected if it builds `ProductImage` objects itself, for example in a custom mapper that skips `mapImage`, in test fixtures, mock data or stories. TypeScript then reports that `name` is missing. Set `name` from `image.name` in your mapper and use a file name such as `'shirt.jpg'` in fixtures.

- **\[Promotions\]** Changed the basket page to derive its promotion banners on the client from the shared `promotions` prop and the basket, in the new `useBasketPromotionBanners` composable. The basket controller no longer fetches active promotions a second time without the customer's access token, so signed-in customers see their customer-scoped promotions in the basket banners. Removed the `activePromotions` page prop. `giftPromotions` stays the only promotion prop the controller provides.

  **\[Breaking\]** The `activePromotions` prop of the basket page no longer exists, and the basket controller no longer provides it. Your fork is affected if its basket page, a component on that page, or a `useBasket` reload list still reads `activePromotions`. A template that reads `activePromotions.length` throws a TypeError, because the prop is `undefined`. Read the banners from `useBasketPromotionBanners` instead. It takes the basket you already hold and returns `banners`, which is `undefined` until the shared `promotions` prop and the basket have hydrated, so check `banners?.length`. Remove `'activePromotions'` from any `useBasket` reload list, because the server no longer provides that key.

  ```diff
  -const { accessToken, checkoutJwt, meta, deliveryCosts, activePromotions } =
  -  defineProps<Props>()
  +const { accessToken, checkoutJwt, meta, deliveryCosts } = defineProps<Props>()
  +const { banners } = useBasketPromotionBanners(basket)
  ```

- **\[Promotions\]** Added the progress bar for promotions configured with only a minimum order value. `PromotionMapperService` now synthesizes a single tier from `customData.minimumOrderValue` and the promotion's own effect, so such a promotion reaches `SFPromotionProgressWrapper` instead of falling into the plain-text branch of `SFDealBanner`. Tiers returned by the Storefront API always win. The custom data field is ignored when the promotion already has tiers, and a promotion without an effect gets no tier, since there is no reward to show at the threshold.

  Removed `minimumOrderValue` from the `Promotion` type. It was only ever copied through and never built a tier. It stays in `PromotionCustomData` as the input of the mapper, and the banner-eligibility filter in the basket controller now reads `promotion.tiers` alone.

  **\[Breaking\]** `Promotion.minimumOrderValue` no longer exists. Your fork is affected if its own code reads `promotion.minimumOrderValue`, for example in a basket banner filter or a custom deal banner. TypeScript reports that the property does not exist, and at runtime the value is `undefined`, so a promotion that has only a minimum order value no longer matches such a filter. Read `promotion.tiers` instead. The tier the mapper synthesizes carries the amount in its `mov` field.

  ```diff
  -const isTieredOrMOVPromotion =
  -  promotion.tiers?.length || promotion.minimumOrderValue
  +const isTieredPromotion = Boolean(promotion.tiers?.length)
  ```

- **\[Promotions\]** Removed the `gift` mapper from `registries.ts`, since `@scayle/storefront` removed that mapper. `GiftService` maps gift products with `ProductMapperService` directly, so they keep the selection and shape of the product detail page. If your shop registers its own gift mapper, move its changes to the product mapper or to a `GiftService` subclass.

  **\[Breaking\]** `GiftMapper` and the `gift` slot of the mapper registry are gone. If your fork still imports `GiftMapper` or registers a `gift` mapper in `registries.ts`, typecheck and the build fail against the new `@scayle/storefront`. Remove both:

  ```diff
  -import { AnalyticsEventMapper, GiftMapper } from '@scayle/storefront/mappers'
  +import { AnalyticsEventMapper } from '@scayle/storefront/mappers'

   // mapperRegistry
  -  gift: ({ storefront, mappers }) => new GiftMapper(storefront, mappers),
  ```

- **\[Routing\]** Consolidated all route patterns in the shared `routes` module as the single source of truth and built every parameterized link through `buildRoute` from `@scayle/storefront/shared`. `buildProductDetailRoute` and `buildProductListingRoute` replace the standalone helpers in `@server/utils/route` and `@server/utils/category`, and `buildSearchRoute` and `getSignInRoute` now append their query through `buildRoute`. The product and listing patterns carry named `(?<slug>…)-(?<id>…)` captures. The SSR route mounts and the link builders all derive from the same shared patterns.

  **\[Breaking\]** The modules `@server/utils/route` and `@server/utils/category` were removed, together with `getProductDetailRoute` and `buildProductListingLink`. Your fork is affected if its own code imports them. TypeScript reports a missing module. Import `buildProductDetailRoute(id, name)` and `buildProductListingRoute(id, path)` from `@shared/routes` instead. The listing builder takes the category `id` and `path` as two arguments, no longer a category object.

  Two more changes can bite code that builds links by hand. `routes.accountOrderDetail` now carries its `{\d+}` constraint, so `routes.accountOrderDetail.replace(':id', ID)` produces a broken URL. Use `buildOrderDetailRoute(ID)`. The product and listing patterns now match only lowercase letters and digits in the slug, where the old patterns matched any text before the id, so a hand-built link with uppercase or other characters ends on the 404 page. Build those links with the two builders.

  ```diff
  -import { buildProductListingLink } from '@server/utils/category'
  +import { buildProductListingRoute } from '@shared/routes'
  -    return buildProductListingLink(category)
  +    return buildProductListingRoute(category.id, category.path)
  ```

- **\[RPC\]** Changed `createBrowserOrpcPlugin` to take the `storefront` shared prop instead of a shop country id, following the `createBrowserOrpcClient` change in `@scayle/storefront`.

  **\[Breaking\]** A fork that updates `@scayle/storefront` makes the same change in two places:

  1. `createBrowserOrpcPlugin` takes the prop and passes it through:

     ```diff
     +import type { BrowserOrpcStorefront } from '@scayle/storefront/client'
        // unchanged lines
     -export function createBrowserOrpcPlugin(shopCountryId: number): {
     +export function createBrowserOrpcPlugin(storefront: BrowserOrpcStorefront): {
        // unchanged lines
     -        createSafeClient(createBrowserOrpcClient<APIRouter>(shopCountryId)),
     +        createSafeClient(createBrowserOrpcClient<APIRouter>(storefront)),
     ```

  2. The client entry registers it with the shared prop:

     ```diff
     -    const shopCountryId = pageProps.storefront?.country.shopCountryId
     -    if (shopCountryId !== undefined) {
     -      app.use(createBrowserOrpcPlugin(shopCountryId))
     +    if (pageProps.storefront !== undefined) {
     +      app.use(createBrowserOrpcPlugin(pageProps.storefront))
          }
     ```

- **\[RPC\]** Moved the basket, wishlist, auth, search and profile oRPC routes into `@scayle/storefront` and removed their route files from `src/server/api/`. `apiRouter` assigns `createBasketRouter(base)`, `createWishlistRouter(base)`, `createAuthRouter(base)`, `createSearchRouter(base)` and `createProfileRouter(base)` next to the `cms` router the application keeps. Client calls keep the same router keys. To customize an SDK RPC, replace its key in `apiRouter`: chain `.errors(...)` and `.use(...)` on it, or rebuild it from its definition with `buildRpc`. The `buildRpc` JSDoc in `@scayle/storefront` has examples.

  The `cms` RPCs are now `defineRpc` definitions built with `buildRpc`, the same shape as the SDK RPCs. `cms.ts` exports `getProductsByIdsDefinition` and `getProductsBySmartSortingDefinition` in place of the `getProductsByIds` and `getProductsBySmartSorting` procedures, which are reached through `cmsRouter`.

  Behavior of the SDK RPCs differs from the removed route files in three places. The `basket.add` input takes `subscriptionDeliveryDate` as an integer from 1 to 31, so a delivery day outside `PREFERRED_DELIVERY_DAYS` passes input validation. The Product Detail Page sends the day as a number, and the stored value stays a string. `PREFERRED_DELIVERY_DAYS` still decides the days the Product Detail Page offers, and `formatDeliveryDay` formats any day from 1 to 31, so the basket and order views keep the delivery-day row for a stored day the page does not offer. `basket.createOneTimeCheckoutToken` accepts `customData.subscriptionDefinition`. `profile.updatePassword` no longer checks the password policy from `src/shared/constants/password.ts`. The Customer Account API enforces the policy configured per shop in the SCAYLE Panel, and the RPC throws `BAD_REQUEST` when it rejects the new password. The account form still validates against those constants before it calls the RPC, so keep them in line with the policy in the SCAYLE Panel.

  **\[Breaking\]** If your fork changed one of the removed route files, such as `basket.ts` or `profile.ts`, move the change onto the matching key of `apiRouter` as described above. Code that imports `getProductsByIds` or `getProductsBySmartSorting` from `cms.ts` has to use the `Definition` exports or call through `cmsRouter`. A fork that relied on the previous rejection of delivery days outside `PREFERRED_DELIVERY_DAYS`, on the password policy check in `profile.updatePassword`, or on `basket.createOneTimeCheckoutToken` ignoring `customData.subscriptionDefinition` narrows those inputs itself by rebuilding the RPC.

- **\[RPC\]** Wrapped the injected RPC client with `createSafeClient` so `useRpcClient()` returns a safe client. Procedure calls now resolve to `{ error, data, isDefined, isSuccess }` instead of throwing. Update custom callers that used `safe(...)` wrappers or `try/catch` around RPC calls to read the result object directly.

  **\[Breaking\]** Every procedure call through `useRpcClient()` in your fork now resolves with a result object and never throws. Code that reads the return value as the procedure's data gets the result object instead, and TypeScript reports the mismatch in most places. A `try/catch` around a call, or a call whose result is ignored, still compiles. The `catch` block never runs on a failure and the code after the call runs as if it succeeded, so check every call. `useAuthentication().logout` follows the same rule. It no longer throws and returns `Promise<boolean>`, with `false` on failure.

  ```ts
  // Before: the call returned the products and threw on failure
  const result = await rpcClient.cms.getProductsByIds({ ids: IDS })
  products.value.push(...result)

  // After: the call resolves with a result object
  const { data, error } = await rpcClient.cms.getProductsByIds({ ids: IDS })
  if (!error) {
    products.value.push(...(data ?? []))
  }
  ```

- **\[Runtime\]** The Storefront Application now runs on Node.js 26. `.nvmrc` and the `Dockerfile` base image now use Node.js 26, and `engines.node` in `package.json` changed from `>= 24.0.0 < 25.0.0` to `^26`, so move your project to Node.js 26 before you take this update.

  Node.js 25 and later no longer ship Corepack, so the `Dockerfile` now installs the pnpm version pinned in `packageManager` with `npm install -g` instead of `corepack enable`. If your project's `Dockerfile` or CI jobs call `corepack`, install it first with `npm install -g corepack`, or install pnpm with npm as the `Dockerfile` does.

  **\[Breaking\]** The minimum Node.js version is now 26, and Node.js 24 and 25 are no longer supported. Every fork is affected. Update your local runtime, your CI images, and your hosting base image to Node.js 26. A `Dockerfile` that still runs `corepack enable` on a Node.js 26 base image fails, because the image no longer ships Corepack. Merge the new `engines.node` value in `package.json`:

  ```diff
   "engines": {
  -  "node": ">= 24.0.0 < 25.0.0",
  +  "node": "^26",
  ```

  Install pnpm with npm in your `Dockerfile`, as the Storefront Application does now:

  ```diff
  -    && corepack enable \
  -    && corepack install -g "pnpm@${PNPM_VERSION}"
  +    && npm install -g "pnpm@${PNPM_VERSION}"
  ```

- **\[Runtime\]** Switched the storage middleware from `@scayle/storefront` to the Valkey GLIDE client, which connects to SCAYLE KV in cluster mode. The Storefront Application adds `@valkey/valkey-glide` to `ssr.external` in `vite.config.ts`. GLIDE loads a platform-specific native binary that the bundler cannot parse, so the SSR build leaves it external and copies it, with its binary, into `.output/server/node_modules`.

  **\[Breaking\]** A local server that talks to the single Redis instance from `docker-compose.yml` fails to connect unless `STOREFRONT_KV_DISABLE_CLUSTER_MODE=true` is set. `.env.example` now sets it. Add the variable to your existing `.env` file. Deployments against SCAYLE KV leave it unset. The README and the Playwright setup guide describe the variable.

- **\[Security\]** Changed `useContentstackEditor` to pass the public stack API key (`cmsEditorData.apiKey`) to the Live Preview Utils SDK instead of the delivery token, which previously shipped to the browser in server-rendered HTML. Rotate `CONTENTSTACK_CMS_DELIVERY_TOKEN` on any Contentstack environment that has been publicly reachable.

  **\[Breaking\]** Rotate the delivery token in Contentstack and update `CONTENTSTACK_CMS_DELIVERY_TOKEN` in every deployment that was publicly reachable, because the old token was part of the server-rendered HTML of editor preview requests. The `cmsEditorData` page prop also renamed two fields. `accessToken` is now `apiKey`, and `region` is now `appHost`, the regional application host resolved on the server. Your fork is affected if its own code reads those fields, for example in a customized `useContentstackEditor`. Live Preview then does not connect in the Contentstack editor, because the Live Preview Utils SDK receives `undefined` as its stack API key. TypeScript may not report it, because `cmsEditorData` accepts any key and a cast such as `as string` hides the missing field.

  ```diff
   stackDetails: {
  -  apiKey: cmsEditorData.accessToken as string,
  +  apiKey: cmsEditorData.apiKey as string,
     environment: (cmsEditorData.environment as string) ?? '',
     branch: cmsEditorData.branch as string | undefined,
   },
   // other Live Preview options omitted
   clientUrlParams: {
  -  host: endpoints.application,
  +  host: cmsEditorData.appHost as string,
   },
  ```

- **\[Security\]** Added baseline security response headers. Every SSR and API response now carries `Strict-Transport-Security`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `X-Frame-Options: DENY`, a `Permissions-Policy`, `Cross-Origin-Opener-Policy: same-origin-allow-popups` and `Cross-Origin-Resource-Policy: cross-origin`, plus a Content-Security-Policy covering the third-party origins of the storefront: the SCAYLE checkout web component, the subscription web components, Google Tag Manager and Usercentrics. Static asset responses carry `nosniff`. The health probe is registered earlier and carries none of them.

  The policy is declared as a single object in `securityHeaders.ts` and assembled by `buildContentSecurityPolicyOptions` from `@scayle/storefront`. Enforcing a directive after the rollout is a one-entry edit to its `enforcedDirectives` array.

  Most of the CSP ships as `Content-Security-Policy-Report-Only`. Third-party tags loaded through GTM pull in origins that cannot be enumerated up front, and so do the payment provider SDKs the checkout web component loads. Collect violation reports from a real environment before switching over to the enforcing header. Set `STOREFRONT_CSP_REPORT_URI` to a collector. Otherwise reports only reach the browser consoles of users. The Security Headers page of the SCAYLE Resource Center describes the rollout and how to add your own origins.

  `frame-ancestors 'none'` is the exception and ships enforced from the start. `cmsCspMiddleware` removes `X-Frame-Options` on CMS editor preview requests and every provider detects preview mode from a query parameter, so clickjacking protection cannot rest on a report-only header there.

  `Permissions-Policy` allowlists `payment` for this origin and the checkout origin rather than denying it, so Apple Pay and Google Pay express checkout keep working. `Cross-Origin-Opener-Policy` allows popups so the PayPal and Klarna flows keep their `window.opener`.

  Moved the GTM `dataLayer` bootstrap out of `SFAnalyticsHead` into `pushGtmStartEvent`, which the client entry calls. The application now emits no inline executable script, so the policy needs no `'unsafe-inline'` for scripts. Replaced `getCheckoutWebComponentOrigin` from `@client/utils/checkout` with `getCheckoutOrigin` from `@scayle/storefront/shared`, so the server middleware, the client, and the Checkout API clients of the SDK share one definition of the checkout origin.

  **\[Breaking\]** Some of these headers are enforced from the first request, not report-only. Your fork is affected in these cases. A page that embeds the shop in an iframe, for example an app shell or a partner page, stops showing it, because `X-Frame-Options: DENY` and the enforced `frame-ancestors 'none'` deny framing for every origin. Custom code that uses the camera, the microphone, the geolocation API or WebUSB fails, because `Permissions-Policy` denies `camera`, `microphone`, `geolocation` and `usb`. `Strict-Transport-Security` is sent with `includeSubDomains` and a max age of one year, so browsers that visited the shop require HTTPS on every subdomain of your domain. `getCheckoutWebComponentOrigin` was removed, so any import of it fails the build. A fork that replaced its client entry must call `pushGtmStartEvent`, or GTM misses its start event. To allow framing or a browser feature, change `xFrameOptions` and `frameAncestors` together, or the matching key in `permissionsPolicy`, in the security headers middleware.

  ```diff
  -import { getCheckoutWebComponentOrigin } from '@client/utils/checkout'
  +import { getCheckoutOrigin } from '@scayle/storefront/shared'
   // other code omitted
  -  getCheckoutWebComponentOrigin(tenantSpace),
  +  getCheckoutOrigin(tenantSpace),
  ```

- **\[Security\]** Stopped exposing `STOREFRONT_*` and `OTEL_*` environment variables to the client bundle. `vite.config.ts` no longer sets `envPrefix`, so Vite only exposes `VITE_*` variables on `import.meta.env`, which is its default. Secrets such as `STOREFRONT_API_KEY` and `STOREFRONT_SESSION_SECRET` could otherwise be inlined into client JavaScript.

  `STOREFRONT_CACHE_COMPRESSION` is now a runtime variable. The `Dockerfile` still accepts it as a build argument, but sets it in the runtime stage as the image's default, where the server reads it at startup. `docker run -e STOREFRONT_CACHE_COMPRESSION=...` overrides it.

  The docs now state that `STOREFRONT_LOG_LEVEL` defaults to `info` when unset.

  **\[Breaking\]** `import.meta.env.STOREFRONT_*` and `import.meta.env.OTEL_*` are now `undefined`. Your fork is affected if its own client or server code reads such a variable from `import.meta.env`, if its `vite.config.ts` still sets `envPrefix`, or if it sets `STOREFRONT_CACHE_COMPRESSION` only for `vite build`. No build error appears. You notice a variable that reads `undefined`, or a cache that compresses with brotli although you configured another encoding. Read server values from `process.env`. Pass a non-secret client value through a `VITE_` prefixed variable. Set `STOREFRONT_CACHE_COMPRESSION` as a runtime variable of the server process. Remove the prefix setting from `vite.config.ts`:

  ```diff
       ],
  -    envPrefix: ['STOREFRONT_', 'OTEL_'],
       ssr: {
  ```

- **\[SEO\]** Fixed the JSON-LD on product listing, search, and product detail pages linking to product and category URLs without the country prefix. The `ItemList`, `Offer`, and `BreadcrumbList` URLs were previously resolved against the bare origin, so with a path-based country selector they pointed to `/p/...` and `/c/...` and search engines followed them to the default shop country. Every link is now localized with `localizeLink` and resolved against `request.origin`.

  **\[Breaking\]** The JSON-LD builders in `src/server/utils/seo.ts` changed their parameters. If your shop calls one of them from its own controller, pass `this.storefront` and `this.request.origin` where you passed a base URL or page URL.

  - `generateCategoryBreadcrumbSchema`, `generateListingProductSchema`, and `generateProductListingItemListSchema` take `storefront` and `origin` instead of `baseUrl`.
  - `getProductListingJsonLd` and `getSearchJsonLd` take `storefront` and `origin` instead of `pageUrl`.
  - `getProductJsonLd` keeps `pageUrl` and takes `storefront` and `origin` after it.

- **\[SEO\]** Fixed pages without a description rendering an empty `<meta property="og:description">` tag. `SEOMeta.description` is now optional, and `PageMetaHead` leaves out both the `description` and `og:description` meta tags when it is missing, so link previews fall back to their own defaults. The not found, account profile, account orders, and search pages, as well as CMS pages without a meta description, no longer pass an empty string. Code that reads `meta.description` as a `string` now has to handle `undefined`.

  **\[Breaking\]** `SEOMeta.description` changed from `string` to `string | undefined`. Your fork notices it as a typecheck error wherever its own code reads `meta.description` as a string, such as a custom head component or a controller that builds on the meta of another page. Guard the read with a check or a fallback. If your fork renders its own meta tag from `meta.description`, add the same `v-if="meta.description"` that `PageMetaHead` has now, so a page without a description renders no empty tag.

- **\[SEO\]** Built every absolute URL from the resolved public origin instead of two sources that could disagree on the same page.

  Canonical links on the PDP, PLP, search, sign-in, wishlist, and CMS pages, the JSON-LD base URL, the OnlineStore `url`, `og:url`, and the tracking `landing_page` all read `request.url` now. Hreflang alternates and the shop and language switcher take `request.origin` rather than prefixing `https://` to a config value. Behind a proxy, canonical links and hreflang alternates no longer point at different hosts. In domain mode the canonical follows the configured country domain rather than whichever host the request arrived on. `useRoute` reads the shared origin during SSR, so external-link detection and the checkout message origin check no longer flip on hydration.

  Renamed the `requestUrl` parameter on the meta functions in `seo.ts`, `product-mapper.ts`, and `search-mapper.ts` to `pageUrl`. `buildCmsHreflangs` now takes an `origin`.

  `storefront.config.ts` drops the `localhost:${PORT}` fallback for `domain`, and the environment variable is renamed from `STOREFRONT_DOMAIN_DEFAULT` to `STOREFRONT_DOMAIN`, matching the config key. It may stay empty locally. Set it in production when the proxy does not forward the public host via `x-forwarded-host`. Production builds with `cacheableRoutes` configured require it and fail at boot without it, since cached pages would otherwise carry whichever host filled the cache. The value is a bare host, so a scheme or trailing slash now fails at boot.

  **\[Breaking\]** Rename `STOREFRONT_DOMAIN_DEFAULT` to `STOREFRONT_DOMAIN` in your `.env` and your deployment configuration. The old name is no longer read. A fork that pins its public host with it falls back to the forwarded host of the request, so canonical links and hreflang alternates follow whatever host the proxy forwards. A production build with `cacheableRoutes` configured fails at boot until `STOREFRONT_DOMAIN` is set. In `storefront.config.ts`:

  ```diff
  -  domain: process.env.STOREFRONT_DOMAIN_DEFAULT || `localhost:${PORT}`,
  +  domain: process.env.STOREFRONT_DOMAIN || undefined,
  ```

  Code in your fork that passes a `requestUrl` property to the meta functions in `seo.ts`, `product-mapper.ts` or `search-mapper.ts` must pass `pageUrl` instead, and calls to `buildCmsHreflangs` must pass `origin`. `ProductListingService` and `ProductDetailService` now take the incoming `request` as a fourth constructor argument, so code that constructs them outside `registries.ts` must pass it. TypeScript reports each of these.

- **\[SEO\]** Changed JSON-LD to a server-only `jsonLd` page prop on the product detail page, the product listing page, the search results page and the homepage. The server-rendered HTML carries the same JSON-LD in its head as before. Client-side navigations and partial reloads, such as PLP pagination, no longer download it, and the head holds no JSON-LD after a client-side navigation. Crawlers read only the server-rendered HTML, so rich results in search engines stay the same.

  **\[Breaking\]** A GTM tag or any other browser-side script that reads `application/ld+json` from the page now finds it on the first page load only. If your shop customized the structured data or the head meta, apply these changes:

  - `PageMetaHead` takes the structured data as its own `jsonLd` prop, typed `PageJsonLd`, and `SEOMeta` loses its `jsonLd` field. A partial reload keeps every prop its response leaves out, so `PageMetaHead` renders the JSON-LD only while the page is still on the URL the server built it for.
  - The product detail, product listing and search controllers build their head meta in a protected `getMeta` method. `ProductMapperService.mapProductDetailMeta`, `SearchMapperService.getSearchMeta` and `mapProductListingMeta` from the server SEO utilities are gone. If your shop customized one of them, move the change to the matching controller's `getMeta`, or to its `jsonLd` prop in `getViewProps` for structured data.
  - `mapCmsPageMeta` no longer builds the homepage OnlineStore JSON-LD and drops its `slug`, `homepageSlug`, `origin` and `logoUrl` parameters. `CmsHomepageController` sends the OnlineStore JSON-LD as its `jsonLd` prop instead.
  - `MapperOverrides` no longer retypes the `search` slot, since `SearchMapperService` now only overrides SDK methods. `mappers.search` carries the SDK `SearchMapper` type. If your shop added a public method to `SearchMapperService` and calls it through the registry, declare the slot in `MapperOverrides` again. The `product` slot stays retyped to `ProductMapperService`.

- **\[Sorting\]** Moved the translation of sort option labels from the server to the client, where vue-i18n now resolves them. Sort options cross the server-client boundary as `{ key, config }`, matching the SDK's `SortOption` contract. The SDK type also has an optional `label`, which only listing providers with their own sort options set. The `label` augmentation was removed from the application's shared types. `SFSortSelection` and `SFMobileSortSelection` use a provider label when there is one and otherwise translate from the option key via the `SORT_OPTION_LABEL_KEYS` map in the client sorting utilities.

  Deleted the `ProductListingController.createSortingOptions` override (the SDK base implementation is used as is), the `CategoryMapperService.mapProductSorting` override, and the label attachment in `SearchMapperService.createSearchSortingOptions`. The `sorting_select.*` translation keys are referenced dynamically, so they are listed in the `no-unused-keys` ESLint ignores alongside the other dynamic key families.

  **\[Breaking\]** The Storefront Application no longer sets `label` on the sort options its controllers and mappers return, and the `label` field was removed from the `SortOption` type augmentation, so `label` is optional now, as in the SDK type. Your fork is affected if its own sorting components render `sort.label` or `selectedSort.label`. They show an empty label without a type error where the value is only interpolated. Resolve the label with `getSortOptionLabel` from the client sorting utilities. A `label` set on the option wins, and otherwise the option key is translated through `SORT_OPTION_LABEL_KEYS`. Add an entry to `SORT_OPTION_LABEL_KEYS` for each custom sort key, or keep setting `label` on the server for it.

  ```diff
  -{{ sort.label }}
  +{{ getSortOptionLabel(sort, $t) }}
  ```

- **\[Subscriptions\]** Fixed how the subscription delivery day reads in several languages. In English, days 3 and 23 now render as "3rd" and "23rd" instead of "3nd" and "23nd". The default plural rule of vue-i18n cannot select the fourth form of a plural message, so `formatDeliveryDay` now picks the suffix from four separate keys by the ordinal category of `Intl.PluralRules`, and its translator takes only the key. The German-style "." suffix is corrected in the Dutch, Swedish, French, Spanish, Portuguese, Romanian, Italian, Greek, Turkish, Hungarian and Lithuanian translations. The `subscription.day_of_month_selection_caption` wording is corrected in the Czech, Slovak, Slovenian, Polish, Bulgarian, Lithuanian, Latvian, Estonian, Danish, Norwegian, Swedish, Dutch, Finnish, Spanish, Portuguese, Romanian, Italian, Greek, Turkish and Hungarian translations.

  **\[Breaking\]** `subscription.ordinal_suffix` changed from one plural message to an object with four keys. If your fork has its own translations, split each locale value, otherwise the raw keys render.

  Before:

  ```json
  "ordinal_suffix": "th | st | nd | rd"
  ```

  After:

  ```json
  "ordinal_suffix": {
    "one": "st",
    "two": "nd",
    "few": "rd",
    "other": "th"
  }
  ```

- **\[Subscriptions\]** Switched the subscription addon on per country with a single `subscriptionEnabled` flag in that country's `publicFields`, read from `STOREFRONT_COUNTRIES_<COUNTRY>_SUBSCRIPTION_ENABLED` (`_DE_`, `_US_`, and `_AT_` for the default countries). The web component hosts and the subscription API URL are now derived from the tenant space with `getSubscriptionOrigin` from `@scayle/storefront/shared` (`https://<tenantSpace>-subscription.addon.scayle.cloud`). Countries without the flag no longer show the product page subscription block or the subscriptions entry in the account navigation and header account popover, and get neither the web component script nor the subscription Content Security Policy origins. The product page does not fetch subscription prices for them either.

  **\[Breaking\]** `STOREFRONT_SUBSCRIPTION_API_URL`, `STOREFRONT_SUBSCRIPTION_OVERVIEW_WEB_HOST`, and `STOREFRONT_SUBSCRIPTION_CANCELLATION_WEB_HOST` are no longer read, and `storefront.config.ts` no longer declares the matching `subscriptionApiUrl`, `subscriptionOverviewWebHost`, and `subscriptionCancellationWebHost` public fields. Remove them from your environment and your config, and set the new flag to `true` for each country that uses the addon. Without the flag, the product page subscription block and the subscriptions entry in the account navigation disappear.

  Add `subscriptionEnabled` to `PublicCountryFields` and set it in each country's `publicFields`:

  ```ts
  declare module '@scayle/storefront/config' {
    export interface PublicCountryFields {
      subscriptionEnabled: boolean
    }
  }

  // Inside a country entry of storefront.config.ts
  publicFields: {
    subscriptionEnabled:
      process.env.STOREFRONT_COUNTRIES_DE_SUBSCRIPTION_ENABLED?.toLowerCase() ===
      'true',
  },
  ```

  The header account popover now builds its links from `useAccountMenu`, so the `account.links.orders`, `account.links.subscriptions`, and `account.links.profile` translation keys are removed in favor of `account.tabs.*`.

- **\[Subscriptions\]** Moved the subscription rules to `@scayle/storefront` and moved the display rows into the client. The product, basket, and order mappers no longer map subscriptions: eligibility, interval options, item-group identity, and the price fetch all come from the SDK. `ProductDetail.vue` and the product detail controller both derive eligibility from `variants.some((variant) => variant.subscription)`, since the SDK attaches `subscription` to a variant only when it can be subscribed to.

  `SFBasketCardSubscriptionData.vue` now builds the interval and follow-up delivery rows itself from the item's `subscriptionDefinition` and its variant's `subscription`, using `useI18n` and `formatDeliveryDay`. The interval falls back to the raw stored value, since order items arrive with a stripped variant that carries no subscription attributes. Nothing on the server builds a subscription display string any more, so the `serverI18nService` dependency came out of the basket and order mappers, and `subscriptionAttributes` is gone from the shared `BasketItem` and `OrderItem` augmentations.

  The oRPC `basket.add` route in `@scayle/storefront` validates `subscriptionDefinition` inside `customData` and no longer accepts `itemGroup` or `pricePromotionKey`. `BasketService.addItem` resolves a subscription group against the current basket and sets the subscription price promotion key itself once the definition is verified, so the product detail subscription flow stopped sending the key. A definition that does not match the variant is rejected and mapped to the `INVALID_SUBSCRIPTION_DEFINITION` error (400). Server callers that legitimately hold an item group or a price promotion key pass them to `services.basket.addItem` directly.

  The deferred `subscriptionPrices` prop of the product detail controller calls `services.subscription.fetchVariantPrices`. The controller leaves it out when the shop country does not set `subscriptionEnabled` or when no variant can be subscribed to.

  Renamed `DEFAULT_PREFERRED_DELIVERY_DAYS` to `PREFERRED_DELIVERY_DAYS`. It and `formatDeliveryDay` are what stayed in the shared types folder, next to the client display types. Removed the subscription custom data and variant augmentations, because `@scayle/storefront` declares those fields itself. No translation keys changed.

  **\[Breaking\]** Several exports of the Storefront Application are gone, and your `registries.ts` needs two changes. Typecheck reports a missing `subscription` slot in the service registry, and a call to `new OrderMapperService(storefront, mappers)` fails with an argument count error.

  ```diff
   // mapperRegistry
  -  order: ({ storefront, mappers }) =>
  -    new OrderMapperService(storefront, mappers),
  +  order: ({ storefront }) => new OrderMapperService(storefront),

   // serviceRegistry
  +  subscription: ({ services }) => new SubscriptionService(services),
  ```

  Import `SubscriptionService` from `@scayle/storefront/services`. Code of your fork that imports from the shared `Subscription` types, constants, or utils modules has to change as well. `SubscriptionDefinition` and `VariantSubscription` now come from `@scayle/storefront/types`. The eligibility, interval, item group, and price promotion key rules moved into `@scayle/storefront`, and `SUBSCRIPTION_ATTRIBUTE_KEYS` is exported from it for mapper queries. `DEFAULT_PREFERRED_DELIVERY_DAYS` is now `PREFERRED_DELIVERY_DAYS`. Code that read `subscriptionAttributes` from a basket item or an order item has to build its rows from `subscriptionDefinition` and the variant's `subscription`, as `SFBasketCardSubscriptionData.vue` does. A client call to `basket.add` that sends `itemGroup` or `pricePromotionKey` in the subscription `customData` is rejected, so drop both and send only `subscriptionDefinition`.

- **\[Tooling\]** Removed the `@components` and `@composables` path aliases. Client components and composables now import through `@client`, for example `@client/components/ui/core/SFButton.vue` and `@client/composables/useRoute`.

  **\[Breaking\]** Code in your fork that still imports through `@components/...` or `@composables/...` no longer resolves. Replace the prefix with `@client/components/...` or `@client/composables/...`, and update `vi.mock` paths the same way.

- **\[Tracking\]** Added the `consent` and `tracking-context` attributes to the checkout and sign-in web components, so the checkout funnel events reach SCAYLE Analytics and carry the GA4 tracking context of the current page. This needs a checkout web component release that reads both attributes (2.1.98 or later). `<scayle-checkout>` gets both attributes, with a new `scayleAnalytics` key in `consent`. `<scayle-auth>` on the sign-in page gets `tracking-context` only, since it sends no SCAYLE Analytics events.

  **\[Breaking\]** `<scayle-checkout>` used to receive no `consent` attribute, which the web component reads as consent for PayPal and Klarna. It now receives the consent manager's decision, so in a country that requires consent management both payment methods stay gated until the customer consents, and `consent-missing` opens the consent manager. If you rewrite the `consent` attribute yourself, keep the `scayleAnalytics` key, or SCAYLE Analytics stays off for the rest of the session:

  ```diff
   <scayle-checkout
     :access-token="accessToken"
     :jwt="checkoutJwt"
  +  :consent="JSON.stringify(consent)"
  +  :tracking-context="JSON.stringify(trackingContext)"
  +  @consent-missing="openConsentManager"
   />
  ```

  In the `Checkout` page, `consent` is a computed object with the keys `paypal`, `klarna` and `scayleAnalytics`, each read with `useConsent`. `trackingContext` is the `context` returned by `useTracking`. On the sign-in page, only `:tracking-context` was added to `<scayle-auth>`.

- **\[Tracking\]** Added the GA4 `add_shipping_info` and `add_payment_info` events to the checkout. Before, GA4 received neither: the checkout web components push them to the dataLayer only when **Send Data Layer Events** is enabled, and that setting stays disabled. `useCheckoutTracking` now forwards both through the new `trackCheckoutStep` in `useBasketEvents`: `add_shipping_info` once per checkout page visit, and `add_payment_info` once per payment method, because the web component reports every payment method click.

  Items, `value` and `coupon` come from the basket, built the same way as `begin_checkout`. The web component reports item prices without tax and promotion, so its own items would have put a second price for the same basket into the funnel. Only `shipping_tier` and `payment_type` come from the web component.

  The cart events the bridge forwards are now deduplicated on their event name together with `correlation_id`, so two different events that share an id no longer drop each other.

  **\[Breaking\]** `forwardCheckoutTrackingMessage` takes the basket as a required third argument. Pass the basket from `useBasket` on the checkout page, and `undefined` on a page without checkout steps, such as the sign-in page:

  ```diff
   const onCheckoutUpdate = async (event: MessageEvent<unknown>) => {
  -  const result = forwardCheckoutTrackingMessage(event, baseUrl.value)
  +  const result = forwardCheckoutTrackingMessage(
  +    event,
  +    baseUrl.value,
  +    basket.value,
  +  )
  ```

  Keep **Send Data Layer Events** disabled for your checkout. With it enabled, GA4 counts every forwarded event twice.

- **\[Tracking\]** Aligned the GA4 dataLayer events with the SCAYLE Analytics events, and moved the building of the GA4 context into the browser. Review your GTM container, because several context fields, list fields and triggers change and the checkout bridge forwards fewer events. `docs/GA4-TRACKING.md` names the source of every field.

  Context:

  - `createTrackingPlugin` builds the context in the browser and holds every event, not only the first `page_view`, until the deferred `customer` prop has resolved. `TrackingContextService` and the deferred `trackingContext` shared prop are removed.
  - `landing_page` is now `landing_page_path`, the path only. `parameter` is replaced by `utm_source`, `utm_medium`, `utm_campaign` and `utm_content` from the landing URL.
  - `session_id`, `landing_page_path`, the `utm_*` fields and `referrer` come from the SCAYLE Analytics browser session, so GA4 and SCAYLE Analytics events of one session share a session id, and a login no longer replaces the landing attribution with the sign-in page. If you remove the SCAYLE Analytics plugin, call `initAnalyticsSession(window.location, document.referrer)` in `src/client/main.ts`, or GA4 loses these fields.
  - `user_id` is `customer.idHash`, which `CustomerMapperService` sets next to `emailHash`. A session stored before this change has no `idHash`, so its `user_id` stays absent until the customer signs in again. `shop_version` is `storefront.config.version`.
  - `page_type` uses the SCAYLE Analytics values: `homepage` for the start page and `account` for all account pages. `page_type_id` stays a top-level key on `page_view` only. `consent_id` is absent where the country requires no consent management. A guest checkout customer reports `login_state: 'logged_out'` without a `user_id`.
  - `page_path` and `previous_page_path` carry the query string, reduced to the allowlist that also filters `page_location`, for example `/de/c/shoes-5?page=2&sort=price_asc`. The query is percent-encoded like the listing links, so match `filters%5B` in a GTM rule, not `filters[`. A path that would exceed `ANALYTICS_MAX_PATH_LENGTH` with its query is reported without it.

  Events and lists:

  - `item_list_name` is the list type (`category`, `search_results`, `product_slider`, `gift_selection`, `basket`, `wishlist`) and `item_list_id` the id within it, the same values as the SCAYLE Analytics `product_list_type` and `product_list_id`. A list without an id sends no `item_list_id`: the wishlist, a CMS product slider and the single product spotlight. The add-to-basket confirmation keeps the GA4-only id `add_to_basket_recommendations`, passed as `itemListId` to `SFProductSlider` and `useProductSliderTracking` from `TrackingItemListIds`, while SCAYLE Analytics reports it as the `trending` slider.
  - `view_item_list` fires once per list with the products of the rendered page, and also for the gift selection. `select_item` carries the variant a tile prices. The `add_to_wishlist` item carries the surface as `item_list_name` and `item_list_id`, and no `quantity` or default `index`. The plus button of a buy-X-get-Y reward pushes `select_item` in the `gift_selection` list.
  - `page_view` fires on every URL change, including PLP pagination, filters, sorting and browser back and forward. The 404 page pushes a `page_view` with `page_type: not_found`.
  - `search` carries the SCAYLE Analytics payload (`search_destination_type`, `search_destination_url` and the conditional `search_destination_id`, `search_destination_filter_groups` and `search_result_count`) and also fires for a term that resolves to a category, product or navigation item. Pagination and filter reloads on the search results page no longer push one. `search_destination_url` and `suggestion_url` carry the country prefix.
  - Quantity changes on the basket page report the units added or removed in `add_to_cart` and `remove_from_cart`, no longer the new line quantity.
  - `begin_checkout`, `login` and `sign_up` now reach the dataLayer. The checkout page fires `begin_checkout` once the `basket` prop has resolved, with the promotion codes as `coupon`. `useCheckoutWebComponent` tracks `login` and `sign_up` on every `auth:success`, with `login_state: 'logged_in'` and the `user_id` of the signed-in customer.
  - The checkout bridge forwards `add_to_cart`, `remove_from_cart`, `add_shipping_info` and `add_payment_info`, and drops every other event the web components post. The Storefront Application fires `begin_checkout`, `purchase`, `login` and `sign_up` itself. Items of a forwarded cart event are rebuilt to the GA4 item schema with a numeric `quantity`, and `currency` and `value` move to event level, with a missing `currency` filled from the shop context.
  - `purchase` carries `transaction_id`, `currency`, `value`, `tax`, `shipping` and `items` inside `ecommerce`, and `total_sale_discount`, `total_campaign_discount`, `total_promotions_discount`, `payment_method`, `carrier` and `delivery_option` at event level. `coupon` is omitted, and so are `payment_method`, `carrier` and `delivery_option` when the order has none.
  - Changing a line's size through `useBasket().changeItemVariant` reports SCAYLE Analytics `remove_from_basket` for the old line and `add_to_basket` for the new variant. The add-to-basket confirmation reports its recommendations on every open.

  **\[Breaking\]** Adapt these exports and call sites:

  - `useCheckoutWebComponent` no longer takes `onAuthSuccess`, since only the callback of the component that initialized the auth API first was ever called. Remove the option:

  ```diff
  -const { trackAuthSuccess } = useAuthEvents()
  -const { apiInitialized } = useCheckoutWebComponent(accessToken, {
  -  onAuthSuccess: trackAuthSuccess,
  -})
  +const { apiInitialized } = useCheckoutWebComponent(accessToken)
  ```

  - Removed: `TrackingListNames`, the `trackingListName` and `trackingSearchTerm` props of `SFProductGrid` and `SFProductSlider`, `search_term` on list events, `trackSearch`, and the checkout web component event types `CheckoutEvent`, `ShopInitEvent`, `ContentViewEvent`, `CustomerDataEvent`, `CartEvent`, `EcommerceData` and `EcommerceItem`. Type a `message` listener as `MessageEvent<unknown>`. `TrackingEcommerceItem` drops `promotion_id` and `promotion_name`, and `TrackingEcommercePayload` drops `payment_type`.
  - `trackViewProductList` is merged into `trackViewItemList(products, surface)`. Search tracking goes through `trackSearchOutcome`. `mapSearchSuggestionForAnalytics` takes the `storefront` shared prop as its first parameter.
  - `toAttributionUrl` is replaced by `toTrackedUrl` for `page_location` and `toTrackedPath` for `page_path`, and `ATTRIBUTION_CLICK_IDS` by the `TRACKED_QUERY_KEYS` allowlist. `IMAGE_VIEW_QUERY_KEY` moved to `@shared/constants/imageView`.
  - `PageTypeSnakeCase` is checked at compile time, so a page added to `Components` needs an entry there.

- **\[Tracking\]** Added SCAYLE Analytics, an event pipeline next to GA4 that sends behavioral events from the browser to the SCAYLE Storefront API. `docs/SCAYLE-ANALYTICS.md` covers the setup, the consent model, what your deployment owns and how to check that events arrive. The "SCAYLE Analytics event list" in `docs/GA4-TRACKING.md` says when each event fires. In the glossary and the code, "Analytics" names this pipeline and "Tracking" stays reserved for GTM and GA4.

  ## How an event travels

  The event-family composables (`useProductEvents`, `useBasketEvents`, `useSearchEvents`, `usePromotionEvents`, `useWishlistEvents`) call `useAnalytics().track(eventName, properties)` next to their GA4 call. The dispatcher, `createAnalyticsPlugin` in `src/client/plugins/analytics.ts`, adds the page context, the session, `device_type` and the consent id, and posts each event to `POST /api/analytics/events`. `src/server/index.ts` mounts that route with `mountAnalyticsRoute` from `@scayle/storefront`, and `src/server/registries.ts` registers `AnalyticsForwardService` and `AnalyticsEventMapper` in the two `analytics` slots. The browser never calls the Storefront API, so the Storefront API token stays on the server.

  ## Events

  The dispatcher sends the 15 events of the SCAYLE Analytics specification:

  - `view_page` on every change of the page URL, query string included, so PLP pagination, filters, sorting, the `?register=true` registration view and browser back and forward each count.
  - `view_product_list`, `view_product_tile`, `select_product`, `view_product_detail` and `apply_filter` for product discovery. The gift selection panel of a buy-X-get-Y promotion reports its rewards as the `gift_selection` surface, and its plus button reports `select_product`.
  - `search`, `view_search_suggestion` and `select_search_suggestion` for the search field and the search results page.
  - `view_promotion` and `select_promotion` for the deal ribbon and the deal banners, once per deal per page view, in GA4 as well.
  - `add_to_basket`, `remove_from_basket`, `view_basket` and `add_to_wishlist`.

  `view_product_tile` fires once half of a `SFProductCard` is on screen, so a card at the edge of a slider no longer counts. `SFGiftPromotionProducts` waits for half of its panel and `SFSingleProductSpotlight` for 30% of itself. `apply_filter` reports one `remove` per cleared value when a customer resets filters, with the `active_filters` and `result_count` after the whole reset. This includes the "Reset filters" buttons of `SFProductListNoResults` and `SFSearchNoResults`. Product events carry `campaign_id` when the price includes a campaign reduction. `quantity` on the basket events is the number of units the interaction added or removed, and an add the Storefront API caps at stock reports the units the basket gained.

  ## Consent

  SCAYLE Analytics has its own consent vendor, `scayle-analytics` in `src/client/consent-vendor.config.json`, separate from `google-analytics`. If your project loads its own Usercentrics configuration, add SCAYLE Analytics there as a custom Data Processing Service and replace the committed id with the one Usercentrics assigns. Until the id matches a service your CMP reports, the dispatcher sends nothing in countries that require consent management. The server logs a warning at boot when `STOREFRONT_USER_CENTRICS_APP_ID` is empty while such a country exists, since the Usercentrics loader never runs without it.

  The dispatcher sends an event only when the vendor is consented and the consent manager holds the CMP's consent id, which travels as `consent_id`. Countries whose `publicFields.consentManagementRequired` is not `true` send without a consent id, and the route refuses a consent-country event without one. Events captured while the CMP loads wait in the queue, and the consent manager's `cmpPending` flag tells the dispatcher to send or discard them with the first consent report. A custom CMP adapter has to set `cmpPending` while its platform loads, and write the vendor's entry in `state` and `consentId` in the same tick. Without `cmpPending`, the dispatcher treats the loading state as a decline.

  There is no flag to turn SCAYLE Analytics off, since consent is the only gate. To remove the pipeline, drop `createAnalyticsPlugin()` from `src/client/main.ts` and `src/client/ssr.ts` and the `mountAnalyticsRoute` call from `src/server/index.ts`.

  ## Session, delivery and deployment

  The session lives in one `localStorage` entry, `scayle-analytics-session`, with the `session_id` and the attribution of the page the session started on. A session ends one hour after its last sent event, and the entry is removed when the user declines or withdraws consent. Each event goes out as its own `navigator.sendBeacon` request. The queue holds up to 1000 events, and an event over the 32 KiB body cap is dropped with a warning. `storefront.config.ts` sets `version` from `package.json`, which the server sends as `shop_version`. Your deployment owns three things the application cannot check: a per-client rate limit on `POST /api/analytics/events` in the CDN or WAF, `'self'` in the CSP `connect-src` directive, and `STOREFRONT_LOG_LEVEL` at `warn` or lower, since every server signal of a broken pipeline logs at `warn`.

  **\[Breaking\]** If your project builds on an earlier version of the Storefront Application V3, these call sites change:

  - `SFProductGrid` and `SFProductCard` take a required `productListType` prop and an optional `productListId`. `SFWishlistToggle` takes the same pair, with `null` for both on the product detail page. `SFFilterSlideIn` takes both, and `SFProductSlider` takes an optional `productListId` from `ProductSliderIds` in `@shared/types/Tracking`.
  - `SFProductListNoResults` takes a required `productListType` and an optional `productListId`. `SFSearchNoResults` takes a required `productListId`, the search term.
  - `useFilter` takes the list surface as a required second argument. `useProductListTracking` takes `productListType`, `productListId` and `total`.
  - `SFDealBanner` takes a required `placement` prop, built with the new `getDealPlacement` in `src/client/utils/promotion.ts`. `useDealTracking` takes a placement getter as its second argument, and the four `usePromotionEvents` helpers take the placement as their second argument.
  - `useProductPromotions().promotions` is `undefined` while the deferred `promotions` prop loads, instead of an empty list. The `ActivePromotion` type is removed.
  - `useBasket().addItem` resolves with the number of units added, or `false`, instead of `true`. `useBasket().updateItemQuantity` fires the basket events itself. `trackRemoveFromBasket` takes the units removed as an optional second argument, `trackAddToBasket` an optional surface as its fourth, and `trackAddToWishlist` the surface as its second, before the optional GA4 index.
  - `trackSearch` moved from `useProductEvents` to the new `useSearchEvents`. `useSearchSuggestionNavigation` returns the dropdown order as `entries`, next to the new `activeSuggestion`.
  - `useRowIntersection` is removed. Call `onProductIntersects(index)` from `useProductListTracking` for the card that intersects.
  - The basket page no longer renders a gift promotion whose reward set is empty, matching the product detail page.

- **\[Types\]** Settled a single import path for SDK domain types and deleted the modules under `src/shared/types/` that only re-exported them.

  `Format.ts`, `Order.ts`, `OrderSummary.ts`, and `Search.ts` held nothing but `export type { … } from '@scayle/storefront/types'`, so types like `Order`, `OrderStatus`, and `BasketItem` were reachable from two paths at once. `OrderStatus` came from both `Order.ts` and `OrderSummary.ts`. Removed those four modules and the re-export blocks in `Basket.ts`, `Customer.ts`, `Navigation.ts`, `Product.ts`, `Promotion.ts`, `ShopConfig.ts`, and `Subscription.ts`. The 205 import statements that went through them now read from `@scayle/storefront/types` directly. What stays in `src/shared/types/*` is only what this application owns, namely `PromotionReduction`, `ProductDetailSection`, `TieredPromotion`, `ActivePromotion`, `PreferredDeliveryDate`, and `PromotionProductConfig`, plus the `declare module` blocks that add shop-specific fields to the SDK types.

  Folded `storefront.d.ts` into `Product.ts`, so a domain's augmentation and its application-owned types share one file. This also fixed a typing hole. `skipLibCheck` meant TypeScript never checked the body of that `.d.ts`, so `ListingProduct.image` and `ListingProduct.breadcrumbs` referenced types the file never imported and degraded to `any`. Checking them for the first time surfaced seven outdated test fixtures, which now use the `url` image shape the product mapper emits.

  **\[Breaking\]** Code your fork added that imports from the deleted modules `@shared/types/Format`, `@shared/types/Order`, `@shared/types/OrderSummary` or `@shared/types/Search` no longer compiles. The same holds for imports of SDK types through the removed re-exports in `@shared/types/Basket`, `Customer`, `Navigation`, `Product`, `Promotion`, `ShopConfig` and `Subscription`. TypeScript reports a missing module or a missing export. Import those types from `@scayle/storefront/types`:

  ```diff
  -import type { Order } from '@shared/types/Order'
  +import type { Order } from '@scayle/storefront/types'
  ```

  If your fork edited `storefront.d.ts`, the merge conflicts because the file no longer exists. Move your change into `Product.ts`.

- **\[Types\]** Made the page-prop contract enforceable, so a misspelled prop name is a compile error.

  The shared contract moved from an `@inertiajs/core` `PageProps` augmentation to a `SharedProps` augmentation on `@scayle/storefront/types`, which is where `inertia.share()` reads it from. `PageProps` in `@shared/types/PageProps` is the application-side name for that contract, and `keyof PageProps` now resolves to the literal union of prop names.

  **\[Breaking\]** Client code reads props through `usePage()` in `@client/composables/usePage` instead of `@inertiajs/vue3`. Inertia types `Page['props']` as an intersection with its own index-signature `PageProps`, so a misspelled name resolved to `unknown` rather than failing to compile. The wrapper returns the index-signature-free contract and narrows `component` to `PageComponentName`.

  Your fork notices in two ways. ESLint reports `no-restricted-imports` on every `usePage` import from `@inertiajs/vue3`, and typecheck fails on a prop name that no page and not `SharedProps` declares. Change the import in each component and composable:

  ```diff
  -import { usePage } from '@inertiajs/vue3'
  +import { usePage } from '@client/composables/usePage'
  ```

  If your fork added its own shared props by augmenting `PageProps` in `declare module '@inertiajs/core'`, declare them on `SharedProps` in `declare module '@scayle/storefront/types'` instead. `inertia.share()` accepts only the keys of `SharedProps`.

  To read a prop that belongs to specific pages, name the pages as the type argument: `usePage<'Search'>()`, or `usePage<'Search' | 'ProductListing'>()` for several. The prop types come from the `Components` registry, so a prop no named page declares is a compile error. Renaming a page prop breaks every read of it instead of turning it silently `undefined`, unless `SharedProps` declares the same key. In that case the read falls back to the shared prop and keeps compiling. Props read this way are optional: the caller can be mounted on a page that does not send them, and a deferred prop is absent until it resolves. A key that both a page and `SharedProps` declare is typed as the union of the two, since which one a caller reads depends on where it is mounted.

  An ESLint rule keeps `usePage` from being imported from `@inertiajs/vue3` again. `*.stories.ts` files are exempt because they mock the module that `.storybook/main.ts` aliases to `.storybook/inertia-mock.ts`, and `mocked()` pointed at the wrapper would return the real function.

- **\[Types\]** Removed `deliveryCosts` from `PageProps`. It was declared there as if it were Inertia shared data, but `sharedDataMiddleware` never populated it. `BasketController` is the only producer, and it sends the value as a page prop. `Basket.vue` now reads `deliveryCosts` from its own props instead of `page.props`, and the two pass-through computeds that wrapped it are gone. A page that needs delivery costs declares its own prop, the same as any other page-scoped value.

  Moved the `Components` registry from the server types module to `global.d.ts` in the shared types, next to `SharedProps`, the interface behind `PageProps`. The registry is the map from Inertia page name to that page's props that types `ctx.render('PageName', props)`. Both describe the server-client prop contract, so they now live together in the shared types. The server types module keeps the `MapperOverrides` and `ServiceOverrides` augmentations. Nothing imports the interface by path, since controllers read it from `@scayle/storefront`, so no call site changes.

  Added a comment to every shared prop that states what the value holds and, for the deferred props, which group it resolves in and what its absence means.

  Aligned the deferred props with what `sharedDataMiddleware` actually sends. `basket`, `wishlist`, and `customer` can be `null`. The middleware resolves `basket` and `wishlist` to `null` on a caught fetch error, and `customer` to `null` after logout, so a plain `T | undefined` claimed a state the server never produces. `useBasket().basket`, `useWishlist().wishlist`, and `useCustomer().customer` widen to match. `promotions` is optional, because it is deferred and missing on the first render.

  Changed `SFBasketSummary` to take the delivery costs as one `deliveryCosts` object instead of the separate `deliveryCostsValue` and `deliveryCostsDisclaimer` strings. Both halves come from one `DeliveryCosts` value and were only split apart at the call site to be rendered a few lines apart.

  `CheckoutController` no longer sends `basket` and `user` as page props. Neither was declared on `Checkout.vue` or read from `page.props` anywhere. The page reaches the basket through `useBasket()` and the user through Inertia shared data, which the middleware already supplies on every page. The checkout error log no longer includes the user id. The checkout prop set is now `meta`, `checkoutJwt`, `accessToken`, plus the two `SimpleLayout` props.

  Removed the `Home` entry from the `Components` registry. There is no `Home.vue` page, because the homepage renders `CmsPage` through the CMS page controller. The `declare module '*.vue'` shim let the dead entry type-check against an empty prop shape instead of failing.

  Removed the unused `Product` union (`DetailedProduct | ListingProduct`) from `@shared/types/Product`. Nothing referenced it. Import `DetailedProduct` or `ListingProduct` directly.

  **\[Breaking\]** Several types and component props changed, so your fork notices them as typecheck errors after the update. `SFBasketSummary` takes one `deliveryCosts` prop instead of `deliveryCostsValue` and `deliveryCostsDisclaimer`. Update every place that renders it:

  ```diff
   <SFBasketSummary
  -  :delivery-costs-value="deliveryCostsValue"
  -  :delivery-costs-disclaimer="deliveryCostsDisclaimer"
  +  :delivery-costs="deliveryCosts"
   />
  ```

  Code that reads `page.props.deliveryCosts` has to declare `deliveryCosts` as a prop of its own page, as `Basket.vue` does. Imports of `Product` from `@shared/types/Product` have to name `DetailedProduct` or `ListingProduct`. Code that reads `useBasket().basket`, `useWishlist().wishlist`, or `useCustomer().customer` has to handle `null`. If your fork's checkout page read the `basket` or `user` page prop, read the basket through `useBasket()` and the user through Inertia shared data instead.

- **\[UI\]** Added `forceOneColumn` to `SFAccordion` and changed its `size` prop to `md` and `lg`.

  - The old `small` and `large` values of `size` are gone. The `small` variant had no call site, and the `large` variant was what every accordion already rendered, so the two-column layout from the `sm` breakpoint up is now simply the default. `size` now takes `md` or `lg` (default) and sets the row height and the type size of the title and content. Existing accordions, including the four CMS providers' `AccordionItemComponent`, render exactly as before.
  - `forceOneColumn` keeps the title and the expanded content stacked at every viewport size. The product detail page's information accordions set it: they sit inside the info column, where splitting an already half-width column again leaves the content too narrow to read. Without a grid the summary also keeps the plain header shape, with the title on the left and the icon on the right, instead of the reversed row that only makes sense inside a grid column.

  **\[Breaking\]** `SFAccordion` no longer accepts `size="large"` or `size="small"`. A fork that passes either value fails typecheck, and the accordion fails to render at runtime, because it looks up its classes by `size`. Search your fork for `<SFAccordion` and replace the value. `lg` is the default and renders what `large` did, so `size="large"` can go. `small` had a two-column layout from the `lg` breakpoint up that no longer exists. Use `md` for its smaller row height and type size, and expect the two columns from the `sm` breakpoint, or add `force-one-column`.

  ```diff
   <SFAccordion
     :id="`${item.id}`"
  -  size="small"
  +  size="md"
   >
  ```

- **\[UI\]** Replaced the custom `supports-hover` variant with Tailwind's built-in `hover:`. Tailwind v4's `hover:` already skips devices that cannot hover, so the custom variant is no longer needed, and hover styles now also apply on hybrid devices such as touchscreen laptops and tablets with a trackpad. This also fixed the missing hover background on `SFBackButton` and the `SFSimpleHeader` navigation links. Checkboxes and radio buttons keep their error and disabled borders while hovered, and the quantity input and price info icons darken when their whole button is hovered.

  **\[Breaking\]** The `supports-hover` variant no longer exists, so a class that uses it generates no style and the hover effect silently disappears. The old variant already included `:hover`, so replace `supports-hover:hover:bg-gray-200` with `hover:bg-gray-200`, `supports-hover:group-hover:opacity-100` with `group-hover:opacity-100`, and a lone `supports-hover:text-accent` with `hover:text-accent`. The variant definition was removed from `index.css`.

- **\[UI\]** Removed Tailwind's default colors and font sizes, so only the tokens in `design-tokens.css` generate CSS. Default classes such as `text-zinc-500` used to work next to the tokens, so colors and sizes outside the design system reached production unnoticed.

  Components that used default classes now use tokens. CMS dividers use `border-gray-400`, the notice for a CMS block without a matching component uses `text-secondary`, the heading on the placeholder CMS page uses `heading-page`, and `SFCountdownLarge` uses `font-bold` instead of `font-extrabold`.

  **\[Breaking\]** Default color and font size classes now generate no CSS, and the build does not warn about them. Replace them in your fork with tokens:

  - Colors: use the closest token, for example `text-secondary` for `text-zinc-500`. To keep a default color, add it to `design-tokens.css`, for example `--color-black: #000;`.
  - Font sizes: token names are one step larger than Tailwind's, so `text-xs` becomes `text-sm` and `text-base/5` becomes `text-lg/5`. A `text-base` without a line height becomes `text-lg/6` to keep its 24px line height. Sizes above `text-3xl` have no token.

- **\[UI\]** Removed design tokens from `design-tokens.css` that repeat Tailwind's defaults or that nothing reads, along with the local pulse and spin keyframes in `index.css`.

  - The font weight (normal, semibold, bold), radius (sm to xl) and pulse and spin animation tokens had the same values as Tailwind's own theme, which still provides them. The utilities that use them compile to the same CSS as before, and Tailwind now emits the keyframes only when an animation utility is used.
  - The 1px and 2px border width, 2px outline width and offset, square aspect ratio and full-screen max width tokens had the same values Tailwind produces without a token. The utilities that use them now compile to those values directly.
  - The z-index tokens (0 to 30) never applied, because Tailwind's z-index utilities read a different namespace and compiled to literal numbers either way.
  - The dialog max height and width, the 1px outline width and offset, and the 3:4 and 9:4 aspect ratio tokens had no references. The matching utilities still work, since Tailwind accepts bare values for them.

  **\[Breaking\]** Your own CSS is affected when it reads one of the removed tokens with `var()`, for example `var(--radius-md)`, `var(--font-weight-bold)` or `var(--z-10)`, or when it sets `animation` to `pulse` or `spin` without a Tailwind animation utility. Utilities such as `font-bold`, `rounded-lg`, `border-2` and `animate-spin` compile as before, so a fork that only uses utilities needs no change. Neither case raises an error, the browser ignores the declaration. Search your fork for `var(--` and for `animation:` and declare each removed token again in your `@theme` block, or use the Tailwind default it duplicated:

  ```css
  @theme {
    --z-10: 10;
  }
  ```

- **\[UI\]** Redesigned `SFDropdown` to match the new Storefront Design System Figma spec.

  - Added `size` (`sm`, `md`, `lg`) and `variant` (`with-label`, `without-label`) props to the trigger, covering the full six-trigger matrix from Figma.
  - Added floating-label behavior on the `with-label` variant. The label animates between the placeholder position and the top-aligned position as the value changes or the trigger gains focus.
  - Drove all states (enabled, hover, focus, open, error, disabled) with design tokens. Removed the `radius` and `button-class` props.
  - Made trigger heights size-driven only (`sm` is `h-8`, `md` is `h-10`, `lg` is `h-12`), matching `SFButton` at every size so adjacent controls (for example the PLP sort dropdown and filter button) align without per-usage height overrides.
  - Added the sub-components `SFDropdownOptionItem` and `SFDropdownOptionGroup`, which mirror Figma's `Dropdown options item` and `Dropdown options group`. The default `#item` slot renders `SFDropdownOptionItem` when no slot content is provided.
  - Added the `SFRadioBase` design-system primitive (native `<input type="radio">` with a non-interactive `decorative` mode). The `leading-radio` type of `SFDropdownOptionItem` renders it decoratively for the radio affordance.
  - Migrated `SFGenderSelection` and `SFVariantPicker` to the new prop surface and shared option-item sub-components.

  **\[Breaking\]** The `radius` and `button-class` props of `SFDropdown` were removed, and the trigger height now comes from the new `size` prop (default `md`). Vue passes the two removed props to the root element as plain attributes, so they style nothing and a dropdown that used them renders at the default size without an error. Search your fork for `<SFDropdown`, drop `radius` and `button-class`, and set `size="sm"`, `size="md"` or `size="lg"` to match the height you had. A custom `#item` slot keeps working. `SFSortSelection` and `SFVariantPicker` changed like this:

  ```diff
   <SFDropdown
  -  class="h-9 w-full lg:w-50"
  +  class="w-full lg:w-50"
  +  size="sm"
  ```

  ```diff
   <SFDropdown
  -  class="h-full"
  -  radius="xl"
  +  size="lg"
  +  :placeholder="$t('variant_picker.select_size')"
  ```

- **\[UI\]** Fixed `SFButton` defaulting to the native `<button>` `type="submit"`. It caused Enter key presses in any text input of a form (for example the Account profile personal information form) to trigger the first preceding non-submit `SFButton` (like the `SFGenderSelection` dropdown trigger) instead of submitting the form. `SFButton` now defaults to `type="button"`. Pass `type="submit"` explicitly for form submit buttons.

  **\[Breaking\]** A form in your fork whose submit button is an `SFButton` without a `type` stops submitting. Clicking the button and pressing Enter in a text input do nothing, and no error appears. Search your fork for `<form` and add `type="submit"` to the `SFButton` that submits it. `SFProfilePersonalInformation` has this change in the Storefront Application:

  ```diff
   <SFButton
     data-testid="personal-info-submit"
  +  type="submit"
     class="self-start"
   >
  ```

- **\[UI\]** Aligned `SFModal` with the Storefront Design System Figma spec.

  - Added structured props (`headline`, `description`, `size`) and an `actions` slot for confirmation layouts. Parents place primary and secondary controls in the slot. Cancel is a fixed button after the slot. Action controls are full width below the `lg` breakpoint and inline from `lg` up.
  - Styled the modal with design tokens (`shadow-overlay`, `rounded-xl`, typography utilities, spacing scale) and `backdrop:bg-primary/50` for the dimmed backdrop, matching `SFSlideIn` and `SFDropdown`.
  - Desktop panels support Small (480px), Medium (620px), and Large (900px) widths. Mobile uses full width with reduced padding and `heading-section-1`.
  - Kept the default slot for custom dialogs. Pass `label` or `labelledBy` when not using `headline`.

  **\[Breaking\]** The `class` of an `SFModal` now lands on the inner panel instead of the `<dialog>`, and a modal without `headline` no longer adds the `p-8` padding of the old dialog. A custom dialog in your fork, meaning an `SFModal` that fills the default slot without `headline`, renders its content flush against the panel edge, and size or padding classes you wrote for the `<dialog>` now act on the panel. Nothing throws, the layout just changes. Search your fork for `<SFModal`, check each one that does not pass `headline`, and add the padding to the slot content or to `class`. `SFProductGalleryZoom` changed like this:

  ```diff
  -    class="size-full max-h-screen! max-w-screen! p-0!"
  +    class="size-full max-h-screen max-w-screen p-0 bg-white"
  ```

- **\[UI\]** Renamed the `--color-disabled-bg` design token to `--color-disabled-background`, so no color token carries an abbreviation. Replace `bg-disabled-bg` with `bg-disabled-background` in your fork.

  **\[Breaking\]** The old token name no longer exists, so a class built from it (`bg-disabled-bg`, `border-disabled-bg`, `text-disabled-bg`) generates no style, and a `var(--color-disabled-bg)` reference resolves to nothing. Disabled fields and checkboxes in your fork then lose their gray background without an error. Search your fork for `disabled-bg` and rename every hit. The token and one component class changed like this:

  ```diff
  -  --color-disabled-bg: #f2f2f2;
  +  --color-disabled-background: #f2f2f2;
  ```

  ```diff
  -    return 'border-2 border-disabled-border bg-disabled-bg'
  +    return 'border-2 border-disabled-border bg-disabled-background'
  ```

- **\[UI\]** Fixed the product slider's arrow buttons looking different from the image slider's. `SFProductSlider` rendered its previous and next arrows with `SFButton`, while `SFImageGallery` and `SFImageStrip` used the shared `SFSliderArrowButton`. `SFProductSlider` now uses `SFSliderArrowButton` too, so all sliders share the same look and feel. `SFSliderArrowButton` no longer defaults its label to image-slider wording. `accessibleLabel` is now a required prop, so every caller supplies a label appropriate to its own context.

  `SFScrollToTopButton` also picks up the same visual language (circular, `bg-gray-300` and `hover:bg-gray-400`, `shadow-input` and `shadow-hover`) in place of its previous outlined `SFButton` styling, for consistency with the slider arrows.

  **\[Breaking\]** `SFSliderArrowButton` no longer falls back to the `image_slider.a11ly.go_to_previous_image` and `image_slider.a11ly.go_to_next_image` texts. If your fork renders it without `accessibleLabel`, Vue warns about the missing required prop, the type check fails, and the arrow button has no accessible name for screen readers. Search your fork for `<SFSliderArrowButton` and pass a label that fits the context of each slider. `SFImageGallery` changed like this for its previous button, and the next button follows the same pattern:

  ```diff
     :disabled="!isPrevEnabled"
     :class="prevArrowClass"
  +  :accessible-label="$t('image_slider.a11ly.go_to_previous_image')"
     tabindex="-1"
  ```

### 💅 Minor Changes

- **\[Account\]** Added customer segment support, so pages and components can vary what they render by the segments of the logged-in customer. The `customer` shared prop now carries `segments`, each with `id`, `name` and `referenceKey`. `useCustomer` returns `segments` and an `isInSegment(referenceKey)` check, both `undefined` while the deferred `customer` prop resolves.

  The new `SFCustomerSegment` component takes one named slot per segment, named by the segment's reference key. It renders the first declared slot whose segment the customer belongs to, or every matching slot with `renderAllMatching`, and its required default slot for everyone else.

  The `customer` prop is eager on every render that is not a shared-cache candidate, so a logged-in customer's page shows their segments from first paint. It stays deferred on cacheable renders. `SEGMENT_DEPENDENT_ONCE_PROPS` lists the once props your shop picks by segment, such as a header navigation per segment. `useAuthentication` reloads them after a login and after a logout, so they follow the new session without a full page load. The list ships empty, since the header and footer navigation are the same for every customer.

  Category pages send the logged-in customer's access token for the category, `listNavigationCategories` and `treeNavigationCategories`, so the products and navigation follow the customer's segments. These requests skip the service cache. Guests and cacheable renders send no token and keep the cached responses.

- **\[Authentication\]** Logging out now keeps the customer on the page they were on instead of sending them to the homepage. `useAuthentication().logout` reloads the current page, so the page's own props and the shared `customer`, `basket`, `wishlist`, and `promotions` props reflect the logged-out session. On an account page, the auth guard answers that reload with a redirect to sign-in.
- **\[Authentication\]** Extended sessions from 24 hours to 30 days. `storefront.config.ts` sets `session.ttl` to `60 * 60 * 24 * 30`, matching the new `@scayle/storefront` default, so a user's basket and a customer's login survive for 30 days without a visit. `AUTH.md` and `config-loading.md` state the new default.
- **\[Basket\]** Added a size selector to the basket card, so a customer who picked the wrong size can correct it on the basket page instead of removing the line and adding the product again. `SFBasketVariantSelector` replaces the plain size label with the variant picker the product detail page uses, and the basket page applies the change through `useBasket().changeItemVariant`. The selector only reports the pick. The basket page performs the change, because it owns the line's loading state and the `giftPromotions` that reload with the basket. The card's loading flag disables the picker while a change is in flight.

  Size editing is off by default. `SFBasketCardDetails` takes a `sizeEditable` prop, and `SFBasketCard` turns it on. Subscription lines keep the plain label, since their stored definition was verified against the variant they were added with and the new variant may not offer that subscription. `SFVariantPicker` gained `disabled` and `ariaLabel` props, and a picker with no variants is disabled like one with a single variant.

  The Storefront API has no endpoint that swaps a line's variant, so the change goes through `basket.changeVariant` from `@scayle/storefront`. It adds the new variant and removes the old line. If the old line cannot be removed, the customer sees a warning that the previous size is still in the basket. The basket page keeps keyboard focus in the picker of the line the change landed on, through `focusVariantSelector()` on `SFBasketCard` and `SFBasketCardDetails`. `useBasket().changeItemVariant` resolves to `{ success, itemKey }`, where `itemKey` names that line.

  The customer gets feedback for every outcome. A successful change shows a "Size updated" toast, and a change that merges the line into one already holding the new size says so. A size that covers fewer units than the line held shows the reduced-quantity toast instead. Each outcome is also announced on the basket page's live regions, and each line's picker has an accessible name that includes its product.

  Toasts now sit below the header and the promotion ribbon instead of at the top of the viewport, and stick to the top once the page scrolls past the header. `SFToastContainer` takes an `anchor` element, which `Layout` passes as a wrapper around the ribbon and the header. The info toast background is no longer semi-transparent.

  The basket page now receives its own `basket` page prop, so the lines render in the first HTML without a second fetch. `BasketItem` carries the variants a line can switch to as `variants`, and `BasketMapperService.Includes` requests them for every basket read, including the shared basket prop on every page. A shop that does not want the extra payload can leave them out of `Includes`.

  The picker is at least 112px wide, grows with its text so a sold-out size is not cut off, and gives way only when the row is narrower. `SFLabelValue` lets its value shrink inside a flex row, so the picker stays inside its card at a viewport width of 320px.

- **\[Build\]** Added a production `Dockerfile` and `Dockerfile.dockerignore` to the Storefront Application V3. The two-stage image builds from the monorepo root, runs as a non-root user, and ships only the build output (`.output/`) and the production `node_modules`. Build-time values (`CMS_PROVIDER`, `SCAYLE_BUILD_ID`, `DISABLE_POWERED_BY_HEADER`, `STOREFRONT_CACHE_COMPRESSION`) are exposed as build args, and the compiled-in CMS provider is recorded as an image label. The README documents how to build and run the image.
- **\[Build\]** Made the Storefront Application install on its own from npm, without the monorepo. `package.json` now lists the published 1.0.0 versions of `@scayle/storefront`, `@scayle/storefront-build`, `@scayle/storefront-opentelemetry`, `@scayle/storefront-devtools` and the CMS packages in place of `workspace:` and `catalog:` references. `pnpm-workspace.yaml` carries the overrides and settings the install needs, and the application has its own `pnpm-lock.yaml`. Run `pnpm install` and `pnpm build` from the application folder.
  Also changed three empty `#fallback` templates to self-closing tags, which `eslint-plugin-vue` requires.

- **\[Caching\]** Added a `scayle-skip-cache` cookie so logged-in customers get a page rendered for them on every cacheable route instead of the cached guest page. `@scayle/storefront` sets the cookie while the session holds a customer, and the CDN and the response cache middleware skip the shared cache for a request that carries it. Cacheable pages now send `public, max-age=0, s-maxage=<ttl>`, so browsers revalidate them with the CDN.
- **\[Checkout\]** Rendered the PDP express checkout button on page load, before a size is selected, and made the flow a single click once a size is chosen. `SFExpressCheckoutPDP` mounts as soon as the product is in its sellable timeframe and not out of stock. No variant, basket, or JWT is created until a user selects a size.

  When a user clicks the button before choosing a size, the storefront scrolls the size picker into view and opens it. The checkout web component reads its `jwt` at click time and does not resume when a token arrives later, so the component prepares the one-time checkout token as soon as a variant is selected. This covers a selection made after the page loaded, single-variant products, and `?variantId=` deep links. The token is created in the browser only, so the server render no longer creates a basket and token that the browser would discard. The token is also refreshed when `quantity` changes, so a changed quantity is never checked out with the quantity the token was created for. A token request that fails before the click stays silent, and the click that retries it shows the error toast.

  When the user dismisses the size picker without a selection, or an express error occurs, the storefront dispatches `scayle:express:reset` so the checkout web component returns the button to its default state. In-flight token requests are dropped on reset, so a cancelled flow cannot leave a JWT behind.

  `SFExpressCheckoutBase` now wraps the checkout web component in a `min-h-27.5` element that is part of the server-rendered HTML, so the content below the express buttons on the PDP and the basket page no longer shifts when they load. The height fits two express payment methods. If your shop offers a different number, adjust the class. On desktop, the add to basket skeleton in `SFProductActions` now has the size of the buttons that replace it.

- **\[CMS\]** Prioritized the LCP-critical CMS image across the dynamic CMS providers (Contentful, Storyblok, Contentstack). Each provider's `ImageComponent` and `SectionComponent` background image now renders `fetchpriority` and `loading` on its `<img>`. The `useLcpPriority` claim, provided by `PageComponent` and, for listing pages, by the above-the-fold teaser `ProductListingPageComponent`, assigns each CMS image its document-order index. `fetchpriority` and `loading` are resolved independently. The first image (index 0) gets `fetchpriority="high"`, while `loading` follows document position. The leading `CMS_EAGER_LOADING_COUNT` images (default 3) load `eager` and the rest load `lazy`. This keeps a visible image next to the hero, such as the top row of an above-the-fold grid, from being forced to `lazy`. The eager window mirrors the `eagerLoadingCount` threshold that `SFImageGallery` and `SFImageStrip` already use. Section backgrounds take part in the same claim, and sections without a background image opt out.

  Editors can override the automatic choice with a **Priority image (LCP)** boolean field on both the image content model and the section content model. The section field covers heroes built as a Section background image (`isPriorityImage` for Contentful and Storyblok, `is_priority_image` for Contentstack). When the field is on, the image renders with `fetchpriority="high"` and `loading="eager"`. When it is off, the automatic choice decides. The component reads the field directly off `contentElement`. `loading` is not exposed to editors. The `scayle` demo provider renders a single static hero and is unaffected.

  The Contentful content model export (`.scayle/cms/contentModel`) and the generated types include the new field. Add the matching field to the CMS space of your fork, as described in each provider's docs.

- **\[CMS\]** Added a `CountdownTimerComponent` for Contentful, Contentstack, and Storyblok so Content Managers can place urgency countdowns on any page or section, including the PLP Teaser.

  The block has two authored properties: a mandatory **End Date** (date and time) and a **Size** (`small` or `large`). It reuses the existing `useCountdownTimer` clock and follows the same display states. It shows "X Days left" while more than 24 hours remain and switches to a ticking `HH:MM:SS` in the final 24 hours.

  - Two shared display components back the sizes: `SFCountdownSmall` (compact, reuses `SFCountdown`) and `SFCountdownLarge` (boxed digits). Both render only in the browser through `<ClientOnly>`.
  - Each provider block maps its native fields (`end_date`/`endDate`, `size`) and is registered in the provider's block dispatch. You can nest the timer in the Page, Section, Grid, Slider, Accordion, and PLP Teaser containers.

- **\[CMS\]** Added `SmartSortingProductsSliderComponent` for Contentful, Contentstack, and Storyblok so merchandisers can place product sliders sorted by a SCAYLE smart sorting key on CMS pages.

  Each provider block maps CMS-authored labels (for example "Sales Push") to `SmartSortingKey` values and loads products through a new `cms.getProductsBySmartSorting` oRPC procedure (`GET /v1/cms/products/by-smart-sorting`). The server applies optional category and brand filters, maps results to `ListingProduct`, and caches responses.

  - Contentstack no longer routes smart sorting blocks through `ProductSliderComponent`.
  - Block dispatch wraps the slider in `<Suspense>` so CMS pages can stream while products load.

- **\[CMS\]** Added a Single Product spotlight component across the Storyblok, Contentful, and Contentstack providers.

  It fetches live product data (name, price, images) by Product ID and renders it through `SFSingleProductSpotlight`, which wraps the standard product tile (`SFProductCard`), identical to PLP and slider tiles. A High Urgency toggle applies the highlighted-deal treatment: colored border, countdown footer, and an optional deal badge, driven by editorial config (background and text color, countdown end date).

  `SFProductCard` now supports a direct `highlightOverride` object so the highlight can be driven without building promotion-shaped input in CMS components.

  The Contentful content model export and generated types include the new `singleProduct` content type. Add the matching block or content type in your remote CMS spaces for Storyblok, Contentful, and Contentstack.

- **\[CMS\]** Added Amplience as a fourth CMS provider. Set `CMS_PROVIDER=amplience` and `AMPLIENCE_CMS_HUB_NAME` (the Content Delivery 2 hub name) to render pages from an Amplience hub. Provider selection stays build-time through the `@cms-server` and `@cms-client` aliases, so no registry or controller change is needed.

  The server side uses `AmplienceCMSService` from the new `@scayle/storefront-cms-amplience` package. It reads `metaTitle`, `metaDescription`, and `robots` from the `page-component` content type. Category pages keep the Storefront Application's own metadata, and no share image is mapped because the Amplience page model has no such field.

  The client provider renders the same blocks as the other providers, plus `CountdownTimerComponent` and `SingleProductComponent`. `AmplienceBlockDispatch` reads each block's `componentType` and passes the payload under the matching key. Rich text renders the native markdown field with `marked` (a new dependency) and sanitizes it. Images and video go through Dynamic Media, and `VideoComponent` reads the asset metadata to find the transcode profiles Amplience applied.

  Draft preview reuses `STOREFRONT_CMS_ALLOW_DRAFTS`. It has to be `true` for a visualization request to serve unpublished content, so leave it off in production. `useAmplienceEditor` updates the preview while an editor types, and `dc-visualization-sdk` loads only inside an editor session. `cmsPreviewRedirectMiddleware` redirects a category page visualization from the placeholder path `/c/cms-preview-0` onto the real category route and keeps the country prefix and query string.

  The content model lives in `.scayle/cms/contentModel/amplience/` and drives both the hub and the generated types in `src/shared/types/cms/amplience/gen/`. `pnpm cms:sync` exports the hub and regenerates the types. The new `pnpm cms:import` pushes the local model to a hub, and it overwrites instead of merging. Content type `settings` (label, icons, visualizations) and `repositories` are replaced, so anything set only in the Dynamic Content UI is lost. The visualization URLs point at `https://localhost:3000`, so replace them with your own origins before importing into a shared hub. `docs/cms/AMPLIENCE.md` explains how to add a content type, what an import replaces, and how to bootstrap a hub.

  `AMPLIENCE_CMS_HUB_ID` and `AMPLIENCE_CMS_PERSONAL_ACCESS_TOKEN` are only read by the two tooling commands, see `.env.example`. A `CMS_PROVIDER` set on the command line now wins over the `.env` value.

- **\[Images\]** Added the `SFImageGallery` and `SFImageStrip` components for image sliders. Each one carries only the ARIA semantics of what it renders, so screen readers describe the slider accurately.

  `SFImageGallery` is a carousel that follows the WAI-ARIA Authoring Practices carousel pattern. The Product Detail Page gallery (`SFProductGallery`) uses it. Slides other than the active one are `inert`, so assistive technology and keyboard focus skip them while touch scrolling still works. The carousel has one Tab stop and supports `ArrowLeft`, `ArrowRight`, `Home` and `End`. `Enter` and `Space` emit `slideClick` for the current slide. It announces "image X of Y" in a polite live region and offers prev/next arrows, a dots indicator (`SFImageSliderDots`), a skeleton state through `isLoading`, and `eagerLoadingCount` to load only the leading slides eagerly.

  `SFImageStrip` is a plain scroll-snap list for the product card image preview (`SFProductCardImageSlider`). It renders a `div` with `role="group"` that holds a `ul` of images. A group, unlike a `section` with a name, does not become a landmark, so many product tiles on one listing page do not repeat landmarks. The strip has no carousel role, live region or dots. Its optional prev/next buttons only jump between images. The "image X of Y" context comes from each image's `alt`. Pass `ariaLabel` with the product name to name the group, otherwise a translated default is used. The strip emits `slideClick` and `activeSlideChange`.

- **\[PDP\]** Made the product details on the product detail page more compact. Each closed section is now a 64px row instead of 128px, section titles are 16px instead of 20px, and the content uses 14px body text, so the sections no longer outweigh the price and the purchase buttons above them. The sections are framed by a divider above and below, wrapped bullet points indent under their first line, and the shipping and returns paragraphs sit closer together. `SFAccordion` takes a new `size` prop for this: `lg` (default) keeps the current look that the CMS accordion blocks use, and `md` gives the compact rows.
- **\[PDP\]** Added Storefront API product videos to the PDP gallery as a first-class media type. Videos insert at a fixed gallery index and autoplay muted on the active slide (desktop grid) or the visible slider slide (mobile). Native `<video controls>` provide play, pause, and mute. Custom overlay chrome and no-audio-track detection are deferred. Leaving a slide pauses the video and rewinds it to the start. Failed videos stay in the gallery rather than being replaced. CDN-hosted videos emit `VideoObject` JSON-LD on the product `subjectOf` node. `uploadDate` is omitted until `ProductVideo.customData` exposes a publication date, so videos are ineligible for Google video rich results. Externally hosted videos render in the gallery but are excluded from JSON-LD because they have no poster (`thumbnailUrl`).
- **\[PLP\]** Added the image view selector to the product listing page and the search results page.

  Users switch the image every product tile shows between the default view and the image types the shop configures, for example a model shot. With a view selected, every image of that type moves to the front of the product's images in unchanged order, followed by the rest, so the tile and its hover slider start with it. A product without such an image keeps its default image and order.

  - Enable it in the Panel: create the attribute group `imageType` with one value per view, and assign at most one value to each product image through the Admin API. The selector stays hidden while the group has no values. The default view's label comes from the new `image_view_selection.default` translation. Every other label is shown as the Storefront API delivers it.
  - On desktop the selector sits next to the sorting control. On mobile it sits in the filter panel below the sorting options.
  - The selection is the `imageView` query parameter, holding the attribute value's key. It changes on the client without a server request, survives reloads and back navigation from the product detail page, and renders the same on the server. Keep `imageView` in your CDN cache key. A switch sends no SCAYLE Analytics `view_page`, because the analytics plugin's dispatcher leaves the `imageView` parameter out when it compares page URLs. A switch only reorders the tiles the page already shows.
  - `ProductImage` gains `imageType`, mapped by `mapImage` on every product surface.
  - The `ProductListing` and `Search` pages take a new `imageViewOptions` prop, `SFProductGrid` and `SFProductCard` a new `imageType` prop, and `SFFilterSlideIn` and `SFFilterSlideInContent` a new `imageViewOptions` prop.
  - `registries.ts` registers `ShopAttributeService` on the new `attributes` service slot from `@scayle/storefront`. It extends the SDK `AttributeService` with `fetchImageViewOptions`, and `ServiceOverrides` retypes the slot so controllers call it without a type assertion.

- **\[Product\]** Redesigned the product price display on listing pages, product detail pages and the basket into a calmer, labeled layout, and made sale indicators follow what the Storefront API marks as a reduction.

  `SFProductPrice` shows the final price, in the sale color when the product is on sale and prefixed with "from" when variant prices differ. Below it are a labeled "Originally" row and an optional "Last lowest price (30 days)" row, which you enable with `showLowestPriorPrice`. A reference price is struck through, with its percentage next to it (for example `-41%`, rendered as `total-reduction`), only when the Storefront API marks a genuine reduction. Otherwise the reference rows show neutral text without a strike-through or percentage. The mapped price carries the flags for this (`isOnSale`, `showOriginally`, `showLowestPriorPriceLine`, `strikeOriginally`, `strikeLowestPriorPrice`, `totalReduction`), and `LowestPriorPrice` no longer has `relativeDifferenceToPrice`.

  The per-discount breakdown moved into the new `SFPriceInfoModal`. On discounted products where the tax note is shown, the whole price row opens it through `SFPriceInfoButton`. The mapped price exposes the formatted reduction amounts for the modal as `saleReduction`, `campaignReduction` and `promotionReduction`. Campaign and promotion badges stay on the product image and in the deal callouts above the price. The size dropdown (`SFVariantPicker`) shows each variant's final price, in the sale color when discounted and grey otherwise.

- **\[Tooling\]** Enabled type-checked ESLint rules for the Storefront Application. `eslint.config.mjs` now passes `typescript.tsconfigPath` to `storefrontV3()`, so production `.ts` files run the `recommendedTypeChecked` set, as the SDK packages already do. `.vue` files are not covered: the type-aware block matches only `.ts`, `.tsx`, `.mts` and `.cts` files, so rules such as `no-floating-promises` do not run in components and pages. Test files, `*.test-d.*` files and root-level `*.ts` files stay on the non-type-aware set.

  The rules that report as errors found real gaps, which are fixed in the application code:

  - Promises that nothing awaited are now awaited or marked with `void`. `useContentfulEditor` awaits `ContentfulLivePreview.init` before it subscribes, so an init failure lands in the existing `catch`. The basket reload, the page reload after a store update and the Usercentrics layer call are marked `void`.
  - `useItemSlider` returns `onScroll` typed as `() => Promise<void>`, which is what the throttled handler returns. Template bindings such as `@scroll="onScroll"` need no change.
  - `parseColumnCount` converts only a number or a string. Any other value uses the fallback. A CMS entry that delivers a one-element array such as `[5]` used to count as `5` and now gets the fallback.
  - Values read from `JSON.parse`, `Reflect.get` and an untyped `Map` are typed, so they no longer flow on as `any`. The CMS middlewares `cmsCspMiddleware` and `cmsPreviewRedirectMiddleware` get a typed `ctx` from the updated `@scayle/storefront` signatures.
  - Redundant `as` assertions and `async` keywords without an `await` are removed. `ScayleCMSService` returns `Promise.resolve(...)` to keep the `Promise` contract of `CMSProviderService`.

  The five `@typescript-eslint/no-unsafe-*` rules stay at `warn`. ESLint types `.vue` imports with empty props, so page props read through `usePage<'ProductDetail'>()` in `plugins/tracking.ts` and `composables/useRouteAnnouncer.ts` still report 13 warnings that `vue-tsc` does not. If you run the same config in your fork, run `pnpm exec eslint --fix .` once after merging and review the remaining errors.

- **\[Tracking\]** Enabled consent management for the US shop by setting `consentManagementRequired` to `true` in `storefront.config.ts`. US users now see the Usercentrics banner, SCAYLE Analytics and GA4 events wait for their consent, and express checkout stays gated until the consent manager reports. Set `STOREFRONT_USER_CENTRICS_APP_ID` for the US shop as for DE and AT, otherwise the server logs a warning at boot and the US shop sends no SCAYLE Analytics events.
- **\[Tracking\]** Google Tag Manager now loads once the application has hydrated, instead of from the document head. `SFAnalyticsHead` no longer renders the GTM script. Its `setup`, which runs while the app hydrates, calls the new `loadGtmWhenIdle` in `gtmBootstrap.ts`. It loads the container the next time the browser is idle after hydration, waiting no longer than `GTM_LOAD_DEADLINE_MS` (2 seconds). GTM and the tags it pulls in, such as GA4, no longer download and run while the page loads and hydrates, which delayed LCP and hydration on mobile.

  Every event pushed to `window.dataLayer` before GTM loads waits there, and GTM processes it in order once it loads. The Usercentrics consent banner still loads from the document head, and SCAYLE Analytics does not go through GTM, so neither changes.

  Check your GTM container against the later start before you upgrade:

  - Tags and container triggers start later, so click, scroll, element visibility and timer triggers miss what happened before GTM loaded.
  - `gtm.dom` and `gtm.load` (DOM Ready and Window Loaded triggers) can fire after the first `page_view`. Move a tag that has to run before it to the Initialization or Consent Initialization trigger.
  - A user who leaves before GTM loads is not reported to GA4.
  - GTM does not load when hydration never starts, for example when the page component's chunk or the locale messages fail to load.

  `docs/GA4-TRACKING.md` ("When GTM loads") describes the timing. Lower `GTM_LOAD_DEADLINE_MS` to start your tags sooner.

### 🩹 Patch Changes

- **\[a11y\]** Fixed accessibility defects in four UI components.

  - `SFAccordion` no longer puts `role="button"` and a hand-tracked `aria-expanded` on its `<summary>`. The role replaced the native disclosure semantics, and `aria-expanded` started as `false` even when the `<details>` element started open. The browser now reports the expanded state straight from the `<details>` element.
  - The `<nav>` in `SFSimpleHeader` now has an accessible name, so the layout used by the checkout and subscription cancellation pages no longer shows an unnamed navigation landmark next to the labeled legal links. The label reads from the new `navigation.a11y.header` translation key, added to every locale file. Forks with their own locale files need to add the key.
  - The default previous and next buttons in `SFItemSlider` are no longer removed from the tab order, so keyboard users can reach them. At a scroll edge they now carry `aria-disabled` instead of `disabled`, so the focused button keeps keyboard focus instead of dropping it to the document.
  - A forward Tab from the arrows of an `SFItemSlider` now moves focus to the first item in view. Before, it landed on the first item and scrolled the slider back to the start. This covers sliders that replace the buttons through the `arrows` slot, and a focused scroll container. Clicks, taps and screen reader cursor moves keep the browser default. `SFProductSlider` dropped its own version of this handoff, which also moved focus that a screen reader had placed on the first card.

- **\[a11y\]** Fixed the accessibility defects that the remaining `vuejs-accessibility` lint rules found, so the shared ESLint config can run them at `error`.

  - `SFProgressBar` names its native `<progress>` element through the new optional `ariaLabel` prop. `SFPromotionProgressWrapper` passes its promotion text, so screen readers announce what the bar tracks instead of an unnamed progress bar.
  - `SFProductCard` reveals its siblings picker when focus enters the card, not only on mouse hover, and hides it once neither hover nor focus remains in the card. Keyboard users could not reach the picker before, because it stayed `inert` without hover. `SFSiblingSelection` also updates its color label on keyboard focus, like it already did on hover.
  - `SFProductSubscriptionSelection` renders the "Interval" and "Follow-up delivery" captions as `<span>` instead of `<label>`. Their dropdowns are named through `aria-label`, so the labels pointed at nothing.
  - `SFModal`, `SFSlideIn`, `SFProductSlider`, `SFImageGallery` and `SFProductGalleryZoom` drop explicit `role="dialog"` and `role="region"` attributes that repeated the role of the `<dialog>` and `<section>` element. The exposed roles do not change.
  - Elements that the lint rules cannot judge, such as listbox options that follow the `aria-activedescendant` pattern or delegated keyboard handlers on a wrapper, now carry an `eslint-disable` comment with the reason.

- **\[a11y\]** Changed the wrapper of `SFCategoryTreeNavigation` from an `aside` to a `div`. The `nav` inside already is the landmark and carries the name, so the unnamed `aside` around it added a second landmark for the same sidebar, and axe reported it with `landmark-unique` next to other unnamed complementary landmarks such as a consent banner. The sidebar looks and behaves the same. Forks that select the sidebar by its `aside` tag in tests or styles should select the `nav` inside it, or `[data-testid="side-navigation"]`, instead.
- **\[a11y\]** Added `aria-current="page"` to the active category link in `SFCategoryTreeNavigationNode`, so a screen reader announces the current category. The link was marked only by its background color and font weight, while `SFCategoryListNavigation` already sets `aria-current`.
- **\[a11y\]** Added a visually hidden `h1` to the checkout page and to the subscription cancellation page. Both pages are rendered by web components that start their own heading outline at an `h2` or render no heading, so the pages had no main heading and axe reported `page-has-heading-one`. The `h1` uses the existing `checkout_page.meta.title` and `subscription.cancellation.meta.title` translations. Forks that replace `Checkout.vue` or `SubscriptionCancellation.vue` should add an `h1` as well.
- **\[a11y\]** Changed the page wrapper in `SimpleLayout` to a `div` on the checkout page, where the `scayle-checkout` web component already renders the main landmark. The page had two main landmarks. The skip link still targets `#main-content`, and other pages keep the `<main>` element. Forks that query `main#main-content` on the checkout page should query `#main-content` instead.
- **\[a11y\]** Fixed the default label of the `SFChip` dismiss button, which was English in every locale ("Remove" followed by the chip text, or "Remove" alone for a chip without text). It now comes from the new translation keys `chip.remove_item` and `chip.remove`, so screen readers announce it in the shop's language. A `dismissAriaLabel` passed to the chip still takes precedence. The label of the promotion code remove button (`basket_promotion_codes.remove_code`) used English word order in German, Dutch, Hungarian, Bulgarian and Turkish and now follows the grammar of each language, for example "{code} entfernen" instead of "Entfernen {code}".
- **\[a11y\]** Translated the screen reader labels in the CMS provider components. The slider pagination dots (`Go to slide 2 of 5`) and the label and tooltip of the video play button (`Play video`) were hard-coded English in the Storyblok, Contentful, Contentstack, and Amplience providers, so screen reader users on non-English shops heard them in English. They now read `slider.a11y.go_to_slide` and `global.play_video` from the locale files. The `▶` glyph on the play button is marked as decoration with `aria-hidden`, so screen readers announce only the translated label. The hero image on the SCAYLE provider's placeholder page reads its alt text from `cms_page.hero_image_alt`, which now describes the image instead of only naming the application.
- **\[a11y\]** Changed the `Error` page to render its content in a `<main>` landmark and to set the document title to the error headline. The page had no main landmark and no title, so screen reader users had no landmark to jump to and no page name to hear. The page shows the same text as before.
- **\[a11y\]** Fixed the keyboard focus halo ignoring the `--color-focus-halo` token.

  The `focus-style` and `focus-style-inset` utilities read the halo color through `theme('colors.focus-halo')`, which Tailwind replaces with the literal value at build time. Overriding `--color-focus-halo` changed nothing, and the halo stayed white. Both now use `var(--color-focus-halo)`, so overriding the token recolors the halo as documented.

- **\[a11y\]** Made the scrolling element of the product gallery and the product image zoom the keyboard focus stop of the carousel. Before, the wrapping `section` took the focus while the scrolling `div` inside was `tabindex="-1"`, so axe reported `scrollable-region-focusable`. The scrolling `div` now carries `role="group"`, `aria-roledescription="carousel"`, the label, `aria-keyshortcuts`, `tabindex="0"`, the `data-testid` (`image-gallery`, `zoom-gallery`) and the `@keydown` handler, and the wrapper is a plain `div`. The tab order and the keys are unchanged. The arrow buttons, the dots and the overlay content now sit outside the scrolling element, so ArrowLeft, ArrowRight, Home and End pressed on one of them, for example after a mouse click on an arrow button, no longer move the slide. Keys pressed on focusable content inside a slide still do. Forks that select the carousel by the `section` tag or style it through the wrapper should target the `data-testid` element instead. Page objects that look up the scrolling element with a nested locator such as `getByTestId('zoom-gallery').locator('.overflow-x-auto')` stop matching, because the element with the test id is the scrolling element itself now.
- **\[a11y\]** Fixed the back button in the `SFMobileNavigation` subcategory panel dropping keyboard focus. It focused the toggle that had opened the panel, but the main list renders a new toggle on the way back, so focus fell to the page body and keyboard and screen reader users lost their place in the menu. Focus now returns to the toggle of the category whose panel was open.
- **\[a11y\]** Added `aria-pressed` to the sort buttons in `SFMobileSortSelection`, so a screen reader announces which sort is active. The selected button was marked only by its border color, while `SFSortSelection` and `SFMobileImageViewSelection` already expose their selected state.
- **\[a11y\]** Moved the initial dialog focus target in `SFModal` and `SFSlideIn` from the anonymous panel wrapper `<div>` to the `<dialog>` element itself. `showModal()` no longer auto-focuses the close button, which previously matched `:focus-visible` and painted a spurious ring on open. Screen-reader users now land on the dialog with its `aria-labelledby` or `aria-label` announced, rather than a role-less `div`.

  The `autofocus` content attribute is honored inconsistently across engines on repeated `showModal()` calls. Chromium drops focus to a non-semantic child on the first open and to the first focusable control on later opens. The `v-dialog` directive therefore now moves focus to the dialog element itself on every modal open. The dialog carries `tabindex="-1"` so it is programmatically focusable. A descendant that opts in with `autofocus` is left to the native algorithm. A `dialog:focus-visible` rule suppresses the global focus ring on the dialog, and interior controls still ring on Tab.

  Removed the manual `triggerElement` ref and the `watch`-based focus restoration in `SFSlideIn` in favor of native `<dialog>.close()` restoration. This replaces the wrapper `tabindex` approach of an earlier fix.

- **\[a11y\]** The accessible names of five controls now match the text they show. The order card link in the order list, the product links in the order details and on the order success page, and the "Sign in" button on the empty wishlist no longer carry an `aria-label` that replaced their visible text, so the visible text is their name. The shop selector now starts its `aria-label` with the text it shows, the region in the header and the shop name in the sidebar. The component adds that text itself, so the `shop_selector.aria_label` translation no longer contains `{shopName}`. The product image on the order details and order success cards is hidden from assistive technology, so the link reads the product name once. This fixes the axe rule `label-content-name-mismatch`. The translation keys `account.orders.card.go_to_order` and `wishlist_page.a11y.sign_in_to_save` are removed from all locale files, since nothing uses them anymore. If your project overrides these components or reads those keys, remove the `aria-label` there as well. If your project has its own `shop_selector.aria_label` translations, remove `{shopName}` from them, otherwise the shop name is read twice.
- **\[a11y\]** Removed the `aria-label` from the current page in `SFPaginationButton`. The current page is a `span`, and a `span` without a role cannot carry an `aria-label`, so axe could not accept the attribute. The visible page number names the current page and `aria-current="page"` marks it, as in `SFPaginationLink`. The other page buttons keep their labels. Screen readers read the current page as its number instead of "go to page".
- **\[a11y\]** Changed the slides of the product image zoom to `div` elements with `role="group"` inside a `div`, where they were `li` elements inside a `ul`. A `li` with a group role is not a list item, so screen readers announced the list wrongly. The zoom keeps its carousel semantics and slide labels. Forks that select the zoom slides by tag name in tests or styles should use `[data-testid^="zoom-gallery-slide"]` instead.
- **\[a11y\]** Fixed two keyboard focus issues in form controls. A readonly `SFTextInput` now shows the focus ring when it receives focus. Before, the ring was tied to the editable states, so a readonly field had no focus indication at all, in regular and in forced-colors mode. In `SFDropdown`, pressing Tab while the option list is open now moves focus to the next control on the page. Before, the scrollable option list took focus for a moment without a ring, and focus was lost once the list closed.
- **\[a11y\]** Stopped loading placeholders from pulsing when the user's system asks for reduced motion. `index.css` sets `--animate-pulse` to `none` under `prefers-reduced-motion: reduce`, so `SFSkeletonLoader`, the `SFButton` loading state, the `SFImageGallery` skeleton slides and the wishlist skeleton keep their gray background but stay still. A placeholder you add with `animate-pulse` behaves the same way without a `motion-safe:` variant.
- **\[a11y\]** Moved the breakpoints to rem and the full-height layouts to dynamic viewport units.

  The `--breakpoint-*` tokens are now `40rem`, `48rem`, `64rem` and `80rem`. At the default font size they match the previous pixel widths, but they now follow the user's browser font size.

  The CMS image, section and video components switch between their desktop and mobile sources at the same `64rem` breakpoint. The `sizes` of product images use the rem breakpoints too. `useDefaultBreakpoints` passes the rem values to `matchMedia` as they are, so it follows a font size change without a reload.

  The page layouts, `body`, the slide-in, the product image zoom and the toast container use `dvh` instead of `vh`, so the mobile address bar no longer hides their bottom edge.

- **\[a11y\]** Improved accessibility of the basket page. The remove button now has an accessible name ("Remove {product} from basket"). Successful quantity changes and item removals are announced to screen readers via polite live regions, and removal failures are announced assertively. After an item is removed, keyboard focus moves to an adjacent remove button instead of being lost. The unavailable-products list is now labelled via `aria-labelledby`, which removes the doubled announcement. The basket headline exposes the item count through sr-only text instead of an `aria-label` override. Removed the invalid `alt` attribute on the basket card list item. Grouped the active-promotions banners in a labelled `<section>`. The `SFQuantityInput` increment buttons use `aria-disabled` instead of native `disabled` for pattern consistency.
- **\[a11y\]** Announced form validation failures to screen reader users. Submitting the profile personal-information or password-management form with invalid fields now moves focus to the first invalid field and then announces a polite live-region summary of how many fields still need attention, alongside the existing inline per-field error messages. The shared handling lives in the new `useInvalidSubmitFeedback` composable.
- **\[a11y\]** Made small dismiss and plain buttons easier to hit, especially on touch devices. The remove button on an applied promotion code in the basket was 12px, the dismiss button of a dismissable `SFChip` 16px, and a small plain `SFButton` 20px high. Each now accepts taps across a target at least 24px wide and 24px high, centered on it, which meets the WCAG 2.5.8 minimum target size without depending on the spacing around the control. None of them changes size or position on screen. The target comes from a new `hit-area-min` utility in `index.css`, which `SFRangeSlider` now uses as well in place of its inline `before:` classes.
- **\[a11y\]** Fixed the accessibility violations that an axe audit of every Storybook story found in components the Storefront Application ships.

  - Raised text contrast to the 4.5:1 minimum in five places:
    - the sale color token `--color-product-sale`, which is `#cc301f` instead of `#d93321`, so sale prices, reduction badges and sale categories measure 5.24:1 on white instead of 4.72:1
    - the active and hovered sale category in the category tree navigation, which sits on the same `bg-gray-200` as every other category instead of a 10% tint of the sale color, where the new token measures 4.68:1
    - the unit labels under a countdown (days, hours, minutes, seconds), which use `text-secondary` instead of `text-gray-500`
    - the sold-out size in the size picker on the basket card, the product detail page and the promotion selection modal, which also uses `text-secondary`
    - the sold-out notice on the basket card and on the product detail page, whose background tint drops from `bg-status-alert/10` to `bg-status-alert/5`
  - Changed the greeting headline on the order success page to an `h2` instead of an `h3`, so the headings no longer skip a level after the page's `h1`. It looks the same.
  - Made `SFDropdown` with a floating label use that label as the accessible name of the combobox and the option list. A `<label for>` cannot name a `div` combobox, so screen readers previously announced it without a name unless `ariaLabel` was also set.
  - Changed the visible label of `SFColorSwatch` to a `<label>` tied to the swatch input, so it names the swatch and clicking it toggles the swatch. The same holds for content passed through its default slot and through the `label` slot of `SFCheckbox`, which no longer replaces the `<label>`. The color filter no longer sets its own `aria-label` on the swatches, so screen readers announce each one by its visible color name inside the filter's color group instead of "Select color" followed by the name. Removed the unused `filter_color_chip.select_color` translation key from every locale.
  - Made `SFProductSlider` without a title, which a CMS product slider block without a headline produces, announce the slider as "Products" to screen readers instead of leaving its region unnamed. The text comes from the new `slider.a11y.products_label` translation key, added to every locale.
  - Made the disabled previous and next controls in pagination on the first and last page announce as unavailable links, and removed the "Go to page N" label from the current page.
  - Changed the `SFImageGallery` slide track, used by the product detail page gallery and its zoom view, to render its slides as `div` elements. It used `ul` and `li`, and the slides' `role="group"` broke the list structure.
  - Put the scroll container of the CMS slider block of all four CMS providers in the tab order, so keyboard users can scroll slides that contain nothing focusable, such as text or image-only slides. Screen readers announce the container as "Carousel", from the new `slider.a11y.carousel_label` translation key, added to every locale.
  - Put the scroll container of the color sibling row on the product detail page in the tab order when every color is sold out, and named it after the color label. Sold-out swatches are disabled links, so nothing else in the row could take focus.
  - Added a `sliderLabel` prop to `SFItemSlider` that names its scroll container as a `group`. Set it whenever `sliderTabindex` is `0`.

  A manual review of the results axe could not decide on its own found four more real issues:

  - `SFDropdown` no longer sets `aria-haspopup="listbox"` on its combobox. The `combobox` role already implies it, and the explicit attribute made axe stop validating `aria-controls` on every dropdown.
  - `SFSearchField` only sets `aria-controls` while its results popover is rendered, so the attribute no longer points at an element that is not in the page.
  - `SFProductSubscriptionSelection` only sets `aria-describedby` on its subscribe button while the disabled reason is rendered, for the same reason.
  - `SFChipGroup` in `multi` and `none` mode renders its `div` with `role="group"` when `ariaLabel` is set, so the prop names the group. An `aria-label` on a `div` without a role is ignored by most screen readers. Without `ariaLabel`, the `div` stays without a role, since an unnamed group only adds noise.

  One finding stays open:

  - The product card image strip stays out of the tab order. Keyboard users reach the product through the card's title link but cannot scroll to its other images, since a tab stop per card would add one stop per product to every listing page.

- **\[Account\]** Registered the `customerAddress` service slot in `registries.ts`, so `services.customerAddress` resolves the new `CustomerAddressService` from `@scayle/storefront`.
- **\[Account\]** Fixed `SFProfilePersonalInformation` showing a success message when a customer emptied the birth date, although the stored date was kept. The Customer Account API can change a birth date but not remove it, so the field is now required once the customer has one. A customer that does not initially fill out their birth date can still save the other fields.
- **\[Account\]** Fixed the personal information form on the account profile page sending an update that failed validation. The submit handler treated the result of `r$.$validate()` as a boolean, but Regle resolves an object with a `valid` field, so the invalid branch never ran. A saved value that the browser accepts but the rules of the form reject, such as a birth date before 1900, was sent to the Storefront API when the customer changed another field. The form now stops the submit, marks the field and moves focus to it, as the password form already did.
- **\[Architecture\]** Changed the `sharedData` middleware to build its middleware with `createSharedDataMiddleware` from `@scayle/storefront`. The file now only declares the shared props and reads the session through `request.session` instead of `ctx.var.session`. The shared props themselves are unchanged.

  A request without a storefront context, such as a path outside every country prefix, now logs the skipped middleware at debug level instead of warn, since this is expected and needs no action.

- **\[Authentication\]** The `exchangeAuthCodeHook` and `refreshTokenHook` of `useCheckoutWebComponent` now handle the new `ALREADY_SIGNED_IN` answer of `auth.exchangeAuthCode` by returning the access token of the current session from `auth.refreshAccessToken`. A second browser tab that still shows the sign-in form after another tab signed in now completes the sign-in instead of failing with "Unable to get access token".
- **\[Authentication\]** Fixed logout failing once the customer's access token has expired. The `auth.logout` RPC required a valid access token, but the session still held the customer record and refresh token. The customer saw an error toast and stayed signed in, so on a shared device the next person was still signed in as that customer. The RPC now ends the session of any signed-in customer. A logout from a guest succeeds and changes nothing, so it cannot discard the guest's basket and wishlist. The RPC ships in `@scayle/storefront` and the application mounts it through `createAuthRouter(base)`.

  `useAuthentication` also clears the Checkout Web Component's tokens from `localStorage` on every logout attempt, not only a successful one. A failed logout used to leave the access and refresh tokens in the browser, where the next person on a shared device could read them. A customer who stays signed in after a failed logout loses nothing lasting, because the checkout page seeds the web component from the server session again on the next full page load.

- **\[Basket\]** Improved the mobile layout of basket cards. The remove button aligns with the top of the product image, the gap between the image and the product information is smaller, the subscription details sit directly below the product details, and the quantity selector spans the same width as the image. The color, size and quantity lines have more space between them.
- **\[Basket\]** Fixed basket items whose product is not yet or no longer sellable showing "Sold out" instead of the out-of-timeframe hint. The `SFBasketCardSoldOutTitle` condition in `SFBasketCard.vue` also fired for any non-active `sellableTimeframe`, so the `SFBasketCardOutOfTimeFrameTitle` branch after it could never be reached. The sold-out title now depends on `variant.isSoldOut` alone and still wins when an item is both sold out and outside its timeframe, matching the product detail page.
- **\[Basket\]** Removed the mapping of each line's `variant` and `promotions` from `BasketMapperService.mapBasketItem`, because the SDK's `BasketMapper` now produces both. The `BasketItem` type augmentation drops them as well. Each line's size options (`variants`) stay in the application. A line's `promotions` is now always a list, so the basket card badges, the promotion-applied checks and the basket tracking payloads read it without a fallback.
- **\[Basket\]** Fixed the vertical spacing between the Delivery and Sale rows in `SFBasketSummary`. The reductions block sat directly against the delivery row with no gap. It now uses `mt-4` to match the `gap-4` rhythm of the rest of the basket summary.
- **\[Basket\]** Fixed the VAT label showing "including VAT" in tax-excluded shops, for example in the US. Three components now react to the actual tax state:

  - `SFBasketSummary` checks `basket.cost.tax?.amountInCents`. The mapper populates `tax` with a zero amount when the Storefront API returns `{ amount: 0, rate: 0 }`, so the previous truthiness check on `basket.cost.tax` was always true.
  - `SFOrderSuccessPaymentSummary` now uses the existing `cost.includesTax` flag from `OrderCost`.
  - `SFProductPrice` checks `price.tax?.amountInCents` when `showTaxInfo` is true.

- **\[Build\]** Fixed the `Dockerfile` so it copies `.pnpmfile.cjs` together with the lockfile before `pnpm fetch`. The lockfile records a checksum of that file, so without it `pnpm fetch` failed with `ERR_PNPM_LOCKFILE_CONFIG_MISMATCH` and the image did not build.
- **\[Build\]** Aliased `lodash` to `lodash-es` in the Vite config. `@contentstack/core` imports the full CommonJS `lodash`, which cannot be tree-shaken, just to use `cloneDeep`. Redirecting to the ESM build lets the bundler keep only what is used. This trims the Contentstack client chunk by 72 kB raw (23.5 kB gzip, 14.4% of that chunk).
- **\[Build\]** Changed the Dockerfile to build from the Storefront Application directory, with `.dockerignore` as its ignore file. The application has its own lockfile and pnpm workspace, so the image no longer needs the monorepo root. Build it with `docker build -t storefront-v3 .` from the application folder. This replaces the earlier change that copied `.pnpmfile.cjs` into the image, since the application has no such file.

  A fork that keeps its own copy of the Dockerfile needs the same changes:

  - Rename `Dockerfile.dockerignore` to `.dockerignore`.
  - Remove `.pnpmfile.cjs` from the first `COPY`.
  - Remove `--filter "@scayle/storefront-application-v3..."` from `pnpm install`, and remove the `pnpm --filter "@scayle/storefront-application-v3^..." run build` line.
  - Replace `pnpm --dir v3/boilerplate build` with `pnpm build`, and `/app/v3/boilerplate/.output` with `/app/.output` in the runtime `COPY`.
  - Remove `--legacy` and `--config.allow-unused-patches=true` from `pnpm deploy`, and replace `--filter "@scayle/storefront-application-v3"` there with `--filter "./"`, so the build keeps working when your fork renames the package.

- **\[Campaigns\]** Fixed a crash on every page render when a campaign is active but has no color configured. `CampaignMapperService.mapCampaign` read `campaign.color.background` / `campaign.color.text` directly off the raw Storefront API response without a null guard, so a colorless campaign threw `Cannot read properties of undefined (reading 'background')` and took down the whole SSR render. The mapper now optional-chains `campaign.color?.background` / `campaign.color?.text` and falls back to the existing `var(--color-campaign)` / `var(--color-primary)` theme variables.
- **\[Campaigns\]** Fixed product prices in the recently viewed slider and in CMS product sliders so they include the active campaign reduction, matching the product detail page and the basket. The `cms.getProductsByIds` and `cms.getProductsBySmartSorting` procedures called the Storefront API without a `campaignKey`, so these sliders showed prices without the campaign. Both procedures now resolve the active campaign key, pass it to the Storefront API, and include it in their cache keys, so entries from before and after a campaign starts no longer mix.
- **\[Campaigns\]** Fixed a hydration mismatch in the countdown skeleton placeholder. The large countdown variant could render a different number of cells on the server than on the client when the remaining time was near the 24-hour boundary, because the skeleton read the live clock while deciding its layout. The skeleton now reserves a consistent layout during server rendering and the first client render, and resolves the standard/urgent split only after mounting.
- **\[Campaigns\]** Fixed the promotion ribbon countdown ignoring the campaign text color. `SFDealRibbon` overrides the border and background of `SFCountdownSmall` but left its `text-primary` class in place, so the pill text was always `var(--color-primary)`. On a dark campaign background such as `#9A3B1E` that rendered dark text on a dark pill at 3.2:1 contrast, below WCAG AA. With the campaign text color the pill reaches 5.1:1 and matches the headline.
- **\[Campaigns\]** Passed `services` into the wishlist, search, recommendations, and gift registry factories so campaign-aware SDK services resolve the active campaign per request.
- **\[Checkout\]** Fixed the `scayle.auth.ready` listener in `useCheckoutWebComponent` calling `initCheckoutAuth` without observing the returned promise. A missing OAuth client ID or a failing `auth.init` escaped as an unhandled rejection. The listener now catches the error and logs it.
- **\[Checkout\]** Added a hover background to the "Back to shop" link in the checkout header, matching the navigation links next to it.
- **\[Checkout\]** Fixed the checkout page writing the checkout JWT to the browser console on a checkout error. Browser logs are not masked, and console capture tools such as Sentry record them. The page still logs the error payload of the `scayle-checkout` web component, without the JWT. The express checkout error log in `SFExpressCheckoutBase` no longer includes the request `url` of the Checkout API error, which can hold the basket key, and logs the message instead.
- **\[Checkout\]** Fixed a flash of empty basket on the checkout page while signing in (`Checkout`). The checkout JWT names a basket key, and signing in moves the user's basket to a new key while emptying the old one, so between `auth:success` and the reload that fetches the new JWT the mounted `<scayle-checkout>` still pointed at the emptied pre-login basket and rendered it as an empty basket. The web component now stays unmounted for the duration of that reload. Its container already reserves the height, and the reload's `onFinish` also runs when another Inertia visit cancels it, so the component always comes back.
- **\[Checkout\]** Changed the checkout header to switch to its mobile layout at the `md` breakpoint (768px) instead of `lg` (1024px), in line with the checkout content, so the mobile navigation no longer shows above the desktop checkout.
- **\[Checkout\]** Fixed a possible server-side rendering crash in `SFExpressCheckoutPDP`. It registered its `useEventListener(document, ...)` call eagerly, and `document` is undefined on the server. The call now runs inside `onMounted`.
- **\[Checkout\]** Removed the hardcoded `px-7` on the simple checkout header so it inherits the same responsive horizontal padding as the footer from the shared `container` utility. The header used 28px padding on all viewports while the footer used 16px on mobile, which caused a mismatch below the `lg` breakpoint.
- **\[CMS\]** Collapsed the dead identity-mapping `switch` in the Contentful, Contentstack, and Storyblok `ButtonComponent`s. Each CMS's `style` field already carries the storefront's own `ButtonVariant` values, so the `switch` only ever returned its own input unchanged. No behavior change. Amplience's `ButtonComponent` keeps its `switch`, since it genuinely remaps `'outline'` to `'plain'`.
- **\[CMS\]** Removed four unused CMS options, none of which had a real caller:

  - `CMSContext.maxWidths` in `useCMSContext.ts`, and the merging logic in `provideCMSContext`.
  - The `eagerLoadingCount` parameter of `resolveImagePriority` in `useLcpPriority.ts`. It always resolves against `CMS_EAGER_LOADING_COUNT` now.
  - `CMSImageOptions.quality` in `image.ts`. Every provider's image optimizer already falls back to a fixed quality, since no caller ever set it.
  - The `isCmsPreview` prop on Amplience's `PageComponent` and `ProductListingPageComponent`.

  No behavior change for any existing caller.

- **\[CMS\]** Extracted the repeated `<picture>` markup (desktop and mobile `<source>` loops, with the fallback `<img>` as a default slot) out of each CMS provider's `ImageComponent`, `SectionComponent` and `VideoComponent` into a `CmsPicture` component. Amplience, Contentful, Contentstack and Storyblok each keep their own copy, and the copies share no code. No behavior changed.
- **\[CMS\]** Rendered CMS rich text at the same font size as the CMS text component. The rich-text wrapper carried no typography class, so only the tags with an explicit render option (`p`, `h1` to `h3`, `a`, `ul`, `ol`) picked up a size. List items, bare text, and any tag without a render option fell through to the browser default of 16px, next to paragraphs at `body-default` (14px). The wrapper now sets `body-default`, so everything inside inherits it. This applies to the Contentstack, Contentful, and Storyblok rich-text components.
- **\[CMS\]** Fixed Contentful live preview so that field edits update the page in real time, including edits to a referenced entry such as a text block, without reloading the preview. Preview sessions fetch entries without link resolution and resolve the links with `contentful-resolve-response`, on the server for the initial render and in the browser after each live update. `useContentfulEditor` subscribes to `ContentfulLivePreview` with the resolved entry, so each update carries referenced entries inline instead of as links that would resolve to their old content. Requests for published content are unchanged.
- **\[CMS\]** Removed `src/client/cms/providers/contentstack/directives/README.md`. It repeated, almost verbatim, the JSDoc already on `vLivePreview` in the adjacent `livePreview.ts`, which is the canonical source now.
- **\[CMS\]** Moved the first and last block margin logic of the Amplience, Contentful, Contentstack, and Storyblok `SectionComponent` into `shouldAddTopMargin` and `shouldAddBottomMargin` in `@client/cms/shared/alignment`. Each provider passes its own vertical alignment field, so sections render exactly as before.
- **\[CMS\]** Applied the `sellableAt` filter to the CMS smart sorting product query, so smart sorting sliders no longer show products with a future sellable date. ID-based CMS product blocks (`getProductsByIds`) are unchanged because that endpoint has no `where` parameter yet. The timestamp is part of the cache key, so a product appears in the slider within the cache TTL after it becomes sellable.
- **\[CMS\]** Aligned link and button URL handling across all CMS providers (Contentful, Contentstack, Storyblok) so they no longer add the country prefix themselves. A new shared helper `normalizeCmsLink` ensures every provider passes raw site-relative paths to `SFLink` and `SFButton`, which then handle country localization centrally. The helper also strips a country prefix when an author included one (for example `/de/about`), avoiding double-localized URLs like `/de/de/about` for Contentful and Contentstack. Authoring guideline: do not include the country path in CMS link fields.
- **\[CMS\]** Upgraded the Storyblok SDK `@storyblok/js` from 5.1.9 to 6.5.0. Rich text rendering in `RichTextComponent` now uses the v6 static `renderers` API instead of the removed `renderFn` option. The Visual Editor preview bridge now starts through `loadStoryblokBridge()` from `@storyblok/js`, which injects the bridge script in editor sessions.
- **\[CMS\]** Aligned CMS responsive image `sizes` attributes with the page container width instead of the full viewport, so browsers pick smaller image candidates at every breakpoint. Srcset width candidates are unchanged. This applies to the Contentful, Storyblok, and Contentstack `ImageComponent`, the `SectionComponent` background images, and the `VideoComponent` posters.
- **\[CMS\]** Dropped `@storyblok/vue` from the Storefront Application V3. The Storyblok `v-editable` directive and the Visual Editor live-preview bridge are now served from `@storyblok/js` (already a dependency), dynamically imported and gated to editor sessions, so `@storyblok/vue` no longer ships in the eager client bundle.
- **\[CMS\]** Fixed the Storyblok Section, Image and Video components so they fall back to the desktop image when the mobile asset field is empty. Storyblok returns an empty asset as `filename: ""` rather than `null`, so the `??` fallback kept the empty string and mobile viewports rendered no background, a broken `<img>`, or a mobile `<source>` list built from an empty URL. The fallback now uses `||`, matching Storefront Application V2.
- **\[CMS\]** Extracted the heading-tag and heading-level lookup logic out of the Amplience and Contentful `TextComponent`s into each provider's own `heading.ts` utility. The two files are identical by design, because each provider keeps its own copy and the copies share no code. No behavior changed.
- **\[Code Style\]** Removed client code that nothing in the Storefront Application uses, and renamed two components to use the `SF` prefix. Nothing changes on screen or in the tracking payloads. If your fork copied any of the removed code, your copy is safe to delete.

  - Removed the `SFSearchInput` component and its `text_input.search.clear` translation key. Search uses `SFSearchField`.
  - Inlined `SFBasketSummaryPromotionsToggle` into `SFBasketSummaryPromotions`, its only parent. `SFBasketSummaryPromotions` now keeps its open state internally and no longer exposes `v-model:visible`, which no parent bound.
  - Renamed `EmptyBasket` to `SFEmptyBasket` and `EmptyWishlist` to `SFEmptyWishlist`. Update the import path and tag name if your fork imports them.
  - `SFNavigationTreeItem` no longer emits `mouseenterNavigationItem`. `SFHeaderNavigationItem` handles hover with `@mouseenter` on its own wrapper.
  - `SFProductImage` no longer takes a `fit` prop, since every caller used the default `contain`. `SFProductImageBase` keeps `fit`.
  - Removed `useCmsAlignment` and the `CMSAlignment` type, because no CMS content model has a lowercase `left`, `center` or `right` text alignment field. The container alignment helpers in the same file stay.
  - Removed `toPathname`, the `TextColor` constant and the empty `ui/pagination/page.ts` module.
  - The `getTrackingDiscount` JSDoc now says it returns `undefined` only when the price has no reduction amount, and `0` for a zero reduction. The `useAuthEvents` JSDoc and the GA4 tracking docs now describe `trackLogin` and `trackSignUp` as the entry points for a custom sign-in or registration surface.

- **\[Code Style\]** Removed two defensive branches that guarded values the types already guarantee. `ProductDetailController` read the promotions service as `(await promotionsService?.fetchActivePromotions()) ?? []`, but `promotions` is a non-optional `ServiceRegistry` slot and `fetchActivePromotions` returns `Promise<Promotion[]>`, so neither the optional call nor the array fallback described a reachable state. `SFProductGrid` returned early from `onProductIntersects` when `trackingListName` was falsy, although the prop is declared required and its sibling `onProductSelect` already used the value unguarded.

  The `SFProductGrid` stories relied on that early return, because they omitted `trackingListName` and so skipped `view_item_list` on intersect. They now pass `TrackingListNames.ProductListing`, matching the prop contract and the real call sites.

- **\[Code Style\]** Replaced the pre-release `@variant` definitions in `index.css` with current Tailwind CSS v4 syntax.

  - The custom `starting` variant is gone, since `starting:` is now a built-in Tailwind variant.
  - `loaded` is now declared with `@custom-variant`, according to the new Tailwind documentation.
  - The two previous `marker` definitions are gone, since they shadowed the built-in `marker:` variant. `SFAccordion` now explicitly hides the summary marker for WebKit browsers with `[&::-webkit-details-marker]:hidden`.

- **\[Dependencies\]** Updated `@inertiajs/core` and `@inertiajs/vue3` from 3.7.1 to 3.11.0. Since 3.9.1, Inertia encrypts every history entry with its own initialization vector. 3.7.1 reused one vector for every entry of a browser tab, so anyone holding two encrypted entries could combine them to read parts of both without the key. The update also makes `router.clearHistory()` flush the prefetch cache, and stops `useRemember` from restoring an earlier page's state on a new visit.
- **\[Docs\]** Added the BSD 3-Clause license as `LICENSE.md` and declared it as `license` in `package.json`. Your fork may use, modify and distribute the Storefront Application under these terms. Keep the copyright notice and the license text in copies of the source.
- **\[E2E\]** Added `data-testid="unavailable-product-list"` to the list of unavailable products on the basket page. The Playwright page object `basketPage.unavailableProductList` already expects it. Forks that replaced the basket page markup and run the Playwright suite need the same attribute on their list.
- **\[Error Handling\]** The `Error` page declares the `basePath` prop that `renderErrorPage` in `@scayle/storefront` now passes, and its home link points to it. Without the declaration, Vue warns in development about an extraneous attribute, because the page renders more than one root node.
- **\[Error Handling\]** Fixed a filter, sort, or page change on the product listing page or the search results page that cannot load its products. The page now stays as it was and shows the error toast, instead of showing the previous products under the new URL as if they were the result. When the category fetch fails during the change, the page also stays and shows the toast, instead of switching to the Error page.

  - The URL, the controls, and the products stay on the last result that loaded. The toast's Reload link and the browser's reload button show that result again, and repeating the change retries it.
  - Moved the `httpException` listener from `main.ts` into `handleHttpException`. It now keeps the page for a server error on the path the page already shows, not only for the exact URL. A 4xx for a new query, like a 404, still shows its page. The listener shows at most one error toast per page at a time, so several failed deferred requests on the product detail page no longer stack toasts.
  - `useFilter` drops the "filters applied" toast of a change whose reload failed. It shows the "filters cleared" toast only once the reload landed, so a failed change shows the error toast alone.
  - `SFFilterSlideIn` remounts its content after a failed request, so a size chip, checkbox, or sort option the user clicked no longer stays selected when its reload failed.
  - The notification plugin now expires a toast after its duration, instead of `SFToast` once it is mounted. A toast shown on a page without a toast container, like the checkout page, no longer shows up on the next page.

- **\[Error Handling\]** Wrapped non-critical deferred prop resolvers in `try/catch` with fallback values so a Storefront API failure no longer leaves their UI region on a loading skeleton:

  - The `basket` and `wishlist` shared props now return `null` on resolver failure, letting the empty-state UI render while the failure is logged.
  - PDP `similarProducts`, `trendingProducts`, and `giftPromotion` now return empty fallback values on resolver failure so the page still renders without recommendations or the gift promotion.

  Also split the `customer` shared prop into its own deferred group (out of `customer-data`) so its reload is independent of `basket` and `wishlist`. A basket Storefront API failure can no longer leave `/account/profile` stuck on a loading skeleton.

- **\[Error Handling\]** Fixed pages answering with the error page when the shop configuration cannot be read. The home page, CMS pages, product detail and listing pages, wishlist, sign-in, order success, account pages, basket and checkout used to answer 500 when the Storefront API shop configuration call failed. They now render without the shop name:

  - Page titles leave out the shop name instead of ending in a dangling separator. `withShopName` adds the shop name through the new `global.seo_title_with_shop_name` pattern (`{title} | {shopName}`), which replaces `global.seo_title_shop_suffix`, so the 11 page titles in the locale files no longer contain the suffix.
  - The product detail, product listing and sign-in pages leave out their description, which names the shop mid-sentence.
  - A CMS page whose entry has no title falls back to an empty title, and the homepage leaves out its OnlineStore JSON-LD.
  - The basket shows the default delivery copy, the same one a shop country without Panel delivery costs shows. `ShopConfigMapperService.mapDeliveryCost()` holds it for both cases.
  - The checkout header's logo link falls back to the "Go to homepage" label.

- **\[Filters\]** Fixed the filter slide-in showing "Your sorting has been successfully applied!" on close when the sort was changed from the desktop sort dropdown before the slide-in opened. `useFilter` used to compare the sort at close with the sort from page load or from the last close. It now records the sort when the slide-in opens through the new `onSlideInOpen` handler, which `SFFilterSlideIn` binds to the `open` event of `SFSlideIn`. The toast now reports only a sort chosen inside the slide-in.
- **\[Filters\]** Fixed the reset button in `SFFilterGroup` sitting a row too low instead of aligned with the section title. The grid placement classes were on the `<legend>` itself, which a browser lays out outside the grid, so its `col-start-1` was ignored and the title dropped out of the header row. The `<legend>` now uses `display:contents` with the grid cell on an inner `<span>`. This restores the alignment on mobile and desktop and keeps the `<fieldset>` and `<legend>` accessibility semantics.
- **\[Filters\]** Fixed the section dividers in `SFFilterSlideInContent` so they use `border-t-gray-300` and match the light grey of the `SFSlideIn` header border. They previously inherited `currentColor`, which rendered as the dark text color and made them noticeably darker than the header divider.
- **\[Filters\]** Mapped the five color filter values that the demo assortment returns but `FILTER_COLORS` had no key for: `weiss`, `schwarz`, `rot`, `gruen` and `silber`. Each one previously fell through to the `#cccccc` fallback, so white, black, red, green and silver all rendered as the same neutral gray swatch and were only distinguishable by their label.

  The four new German color names reuse the hex values of their suffixed counterparts (`weiss_1`, `schwarz_1_2`, `rot_1_2`, `gruen_1_2`), which stay in the map because those slugs are still in use. `silber` is new at `#c0c0c0` and carries `showBorder` so the light swatch keeps a visible resting border and a legible check mark when selected.

- **\[Header & Footer\]** Fixed the back button label in `SFSimpleHeader` running under the centered logo on narrow viewports. A long translation (e.g. French, Italian, Turkish) was partly covered by the logo on narrow screens. The button now stops before the logo, and a label that does not fit ends in an ellipsis. Screen readers still read the full text. The label of `SFBackButton` also shrinks when a parent limits the button's width.
- **\[Header & Footer\]** Fixed the focused search field in `SFHeader` covering the last navigation links on small desktop screens. The navigation shrank below the width of its links to make room for the widening search field, which then rendered on top of them. The navigation now keeps the width of its links, and the search field fills the remaining space down to a minimum width of 160px. When a long navigation and that minimum width don't fit next to each other, the navigation links that have no room are hidden.
- **\[Header & Footer\]** Fixed the footer ending above the bottom of the viewport on pages with short content, such as the basket and an empty wishlist.
  The page wrapper in `Layout.vue` was a plain `div`, so the `grow` on `main` had no effect and left white space below the footer on tall viewports. The wrapper now uses `flex min-h-dvh flex-col`, as `SimpleLayout.vue` already does.
- **\[Header & Footer\]** Fixed pages scrolling sideways at viewport widths from 280px up to 319px, such as the cover screen of a foldable phone. `SFHeader` now uses tighter spacing below 320px, and nothing changes from 320px up. Below 280px the header row still does not fit, and the basket icon leaves the viewport below about 260px.
- **\[Header & Footer\]** Fixed a Vue hydration mismatch on the homepage by gating the copyright year in `SFBottomFooter` behind `useMounted()`. The footer evaluated `new Date().getFullYear()` during render. The result differs between SSR (UTC) and the browser (local timezone) around the Jan 1 UTC boundary and triggered the `Hydration completed but contains mismatches` warning.
- **\[Images\]** Changed PDP gallery images to request the width their grid tile renders at. Every tile used the `detail` preset (`sizes` of `50vw`), so a tile sharing its row with two others fetched the same 1280px image as a full-width one. Added three presets to `IMAGE_VARIANTS` that follow the PDP layout: `galleryFull`, `galleryHalf`, and `galleryThird`. At 1440px on a 2x display, half tiles drop from 1280px to 768px and third tiles to 512px.

  `SFProductImageGrid` picks each tile's preset from its grid row with `buildGalleryTilePresets`, and the mobile slider in `SFProductGallery` uses the same list. Every tile preset is `100vw` below 640px, so the slider images are sized correctly, and the eager first image of the hidden layout resolves to the URL the visible one already fetched. The row partition moved from `SFProductImageGrid` into `partitionGalleryRows` in `@shared/utils/productGalleryMedia`, so presets and column spans follow the same rules.

  The zoom modal uses a new `galleryZoom` preset, sized for the maximum zoom scale rather than the resting frame so images stay sharp when zoomed in: 1.5x the frame from 1024px up, 2x the slide width below. Zoom slides now fetch up to 2048px, where they used to stop at 1280px.

- **\[Images\]** Fixed the hero image of the placeholder homepage that ships with the Scayle CMS provider not rendering on first load in Safari. It now serves the existing AVIF inside a `<picture>` element with a WebP fallback. The Storyblok, Contentful, Contentstack, and Amplience providers are not affected. Safari intermittently failed to paint the first AVIF decode after SSR, leaving a broken-image icon until a client-side navigation re-rendered the node. The `<img>` also gained intrinsic `width` and `height`, `decoding="async"`, and `fetchpriority="high"` to reserve layout and prioritize the LCP element.
- **\[Navigation\]** Fixed the sale color in the category tree navigation. `SFCategoryTreeNavigationNode` decided the sale styling with `node.isSale && node.depth === 2`, which only lands on a shop whose sale category sits one level below a root category. In a shop where "Sale" is a root category, the sale category itself rendered in the default color while all of its subcategories turned red, because the Storefront API marks every category below a sale category as a sale category too. The node now compares against its ancestors instead of a fixed depth, so the sale color marks where a sale branch starts at any level and the subcategories below it keep the default color.
- **\[Navigation\]** Fixed the desktop navigation flyout clipping the last item of a full column. The panel was fixed at `h-80` (320px), while a column filling all seven `grid-rows-7` slots needs 335px for its content, so the last entry rendered past the panel edge. The panel now uses `min-h-80`, which keeps the previous height for short navigations and grows to fit longer ones.
- **\[Observability\]** Logged a failed CMS fetch on the product listing page once, with the category ID.

  The CMS provider packages no longer log an error they rethrow from `fetchListingPageData`, so the `Unexpected CMS error on PLP` entry from `ProductListingController` is the only one. It now carries `categoryId`, which the provider entry used to add.

- **\[Observability\]** Removed the unused `X-Customer-Token` entry from the OpenTelemetry request header allowlist. The header never arrives on incoming requests, and capturing it would have added customer access tokens to spans without redaction.
- **\[Orders\]** Changed the order history page to receive its order summaries as an eager prop instead of a deferred one. The controller resolves the summaries before rendering, so the page no longer ships a loading skeleton or an error toast for them. A failed fetch surfaces through the regular error page rather than an empty list.
- **\[Orders\]** Removed the `campaign` prop from `SFOrderDetailProductList` and `SFOrderDetailProductCard`, and the account order detail page (`AccountOrderDetail`) no longer passes `$page.props.campaign` to them. The card never read the prop, so order detail never showed campaign colors. The shared `campaign` page prop stays, because the layout, the basket and product pages, and the tracking events still read it.
- **\[Orders\]** Fixed the payment summaries on the order success page and the order detail page falling short of the total for an order with a fee other than delivery, for example a cash on delivery payment fee. The fee now shows in its own "Other fees" row from `OrderCost.otherFees`, with the new `other_fees` translation key under `order_information.payment_summary` and `account.order_detail.payment_summary` in every locale.
- **\[OSP\]** Mapped the common shipping carrier keys to carrier names in `global.carrier_key`, so the order success page no longer renders a raw i18n key path such as `global.carrier_key.DHL_STD_NATIONAL` as the carrier.

  The Storefront API returns only a bare `carrierKey` string on `OrderResponse.packages[]`, with no name, id object or translations. `SFOrderSuccessDeliveryDate` resolves the display name through `$t('global.carrier_key.' + carrierKey)`. That block held a single `DEFAULT` entry, so every real carrier key fell through and vue-i18n printed the key path. Added `DHL`, `DHL_STD_NATIONAL`, `HERMES`, and `HERMES_STD_NATIONAL` across all 24 locale files.

  The values are identical in every locale because carrier names are brand proper nouns and are not translated. The Admin API carrier `name` is not copied either, because for several carriers it only echoes the key (`HERMES_STD_NATIONAL`), which should not reach a customer. The keys encode an internal route or service suffix, while the customer-facing fact is the carrier brand.

  Carrier keys outside this set still render the raw key path. If the carrier configuration in your SCAYLE Panel differs, add your own entries under `global.carrier_key`.

- **\[OSP\]** Centered the email confirmation note in the order success greeting box when it wraps on small screens.
- **\[PDP\]** Aligned the mobile overlay controls on the product detail page with the header navigation.

  - The gallery-overlay back button and wishlist toggle now align with the header's icons, sitting on the page's container gutter. The wishlist heart is now 24px and uses the primary color at rest, and `SFWishlistToggle` gained a `restingIconClass` prop for this.
  - The gallery image is now edge-to-edge on mobile, with its rounded corners removed below the `sm` breakpoint. Corners are unchanged from `sm` up, and on product cards and the zoom modal.

- **\[PDP\]** Fixed product images on the product detail page not showing in Safari and all iOS browsers below 640px. The gallery column had no width of its own at that size, so it took the width of its content. The gallery sizes that content only with percentages and aspect ratios, which WebKit resolved to 0, leaving the images at 0x0. The column now stretches to the full width, including the bleed past the page padding.
- **\[PDP\]** Fixed a single tap on a product image on the product detail page not opening the full-screen image in Safari and all iOS browsers. The first tap did nothing and only the second tap opened it. iOS counts a tap as a hover, and the hover revealed the slider's previous and next arrows. iOS drops the click of a tap that reveals content on hover. Touch devices now get no arrows on the slider, as on the product card, and swipe between images instead.
- **\[PDP\]** Adjusted the spacing and order of the promotion and campaign banners on the product detail page. `SFPromotionConfirmation`, the banner for an applied promotion, now renders directly below `SFProductPrice` and ahead of the deal banners. `SFProductDealBanners` carries its own `mt-4 mb-2` margin instead of relying only on the parent's `gap-5`. It also no longer renders an empty wrapper when a campaign is live but the variant has no campaign reduction and no promotions apply, so its margins no longer leave stray vertical space.
- **\[PDP\]** Fixed the product detail page scrolling sideways at a viewport width of 320px in locales where the size picker text is long, such as German. The size picker could not get narrower than its text, so next to the quantity stepper it pushed the row 24px past the right margin, which fails the WCAG 2.2 reflow check (success criterion 1.4.10). `SFDropdown` and its trigger text can now shrink, so text that does not fit ends in an ellipsis and the row fits at 320px in every locale. The full text stays in the DOM. Any other `SFDropdown` whose selected value or placeholder is wider than the space it has now truncates the same way.
- **\[PDP\]** Moved the product information accordions into the info column of the product detail page and pinned each column by its own height.

  `SFProductDetails` now renders below the add-to-basket block inside the info column instead of full-width below both columns.

  Both columns already stuck from `lg` up. They now share one height-aware offset rule (`useStickyColumn`) in place of the fixed `top: 2rem`. A column shorter than the viewport still pins near the top. A column taller than the viewport scrolls until its bottom edge is reached before pinning, so nothing is cut off. This matters now that the accordions can make the info column the taller side. A column as tall as the row has no travel within its grid area, so it stays inert and scrolls. Whichever side is longer moves, the other holds, and both scroll when both are long. The pin releases at the bottom of the two-column row, where the recommendation sliders begin.

- **\[PDP\]** Fixed the empty slide shown while the zoom view of the product detail page loads an image. The zoom view shows a larger image variant than the PDP gallery, and the CDN may still have to generate it on the first request, which left the slide empty for up to a second. `SFProductGallery` now adds a `<link rel="preload" as="image">` per zoom image to the document head, with the `imagesrcset` and `imagesizes` of the zoom view and `fetchpriority="low"`. The browser loads the file the `<img>` of the zoom view picks, so the zoom view opens from the browser cache. From 1024px up it preloads the zoom image of every gallery image. Below 1024px only the first one preloads, because the others carry `media="(min-width: 1024px)"`. Each zoom image there is twice the viewport width, and the zoom view opens from the first image more often than from any other.

  Every product detail page view now downloads these zoom images whether or not the zoom view is opened, and Chromium logs an unused-preload warning for each one the zoom view does not show within a few seconds of the window `load` event.

- **\[PDP\]** Fixed the gallery zoom on the product detail page opening on the first image instead of the clicked one.

  `SFProductGalleryZoom` is created lazily on the first zoom of a page view, so it was born with `visible` already `true` and `currentSlideIndex` already pointing at the clicked tile. That first open has no prop change for a watcher to react to, so it always showed the first image. Later opens reuse the same mounted instance, and the `currentSlideIndex` watcher already handled them. The slider now starts on `currentSlideIndex` and scrolls to it once its element exists. That is a tick after mount, because the modal renders its content on the client only.

- **\[PDP\]** Hid the recently viewed product slider on the PDP when the user has no recently viewed products. Before, the slider title rendered above an empty list whenever the localStorage history was empty, for example on the first PDP visit. Added a `v-if` guard and the `data-testid="recently-viewed-products-slider"` selector that the E2E test relies on.
- **\[PDP\]** Fixed product gallery zoom flicker. On desktop, zooming back out no longer jumps, because the zoom-out path keeps the `transform-origin` in place instead of resetting it mid-animation. `transform-origin` is not animatable. The touch (translate) path still resets it. Closing the fullscreen zoom view no longer flickers in Firefox, because no-backdrop modals now keep their fixed-fullscreen frame without an `[open]` condition. The frame survives the leave fade instead of collapsing when the native `<dialog>` closes.
- **\[PDP\]** Fixed the mobile PDP floating "Add to basket" and scroll-to-top bar covering the footer legal links (Imprint, Privacy, Terms) when scrolled to the bottom of the page. `SFBottomFooter` now reserves mobile-only bottom space on the Product Detail Page so the links clear the fixed bar. Desktop is unaffected because the bar is hidden there.
- **\[PDP\]** Fixed inconsistent horizontal spacing of mobile PDP components. They now align to a single 1rem rail matching the top navigation, with the image gallery as the only full-width exception. Removed the redundant per-component padding that stacked on top of the page `.container`'s 1rem inset and caused insets of 2 to 3rem. The gallery now runs edge to edge on mobile. The floating "Add to basket" bar changed from `px-3` to `px-4` so it no longer overshoots the rail. Also fixed the mobile header burger button, which rendered 32px wide around a 24px icon. The extra 4px of horizontal padding on each side pushed its icon off the 1rem rail.
- **\[PDP\]** Fixed sold-out variant add-to-basket controls appearing available. `SFButton` now honors fallthrough `aria-disabled` for soft-disabled styling and click suppression, and the variant picker reflects sold-out selections in the closed trigger.
- **\[PDP\]** Fixed the vertical thumbnail slider of the product detail page gallery being scrollable horizontally. The `SFItemSlider` outer wrapper set only `overflow-y-scroll` in vertical mode, so the CSS spec promoted `overflow-x` from `visible` to `auto` and turned the wrapper into a horizontal scroll container. The wrapper now also sets `overflow-x-hidden`, which restricts vertical mode to vertical scrolling only.
- **\[PDP\]** Fixed `SFProductActions` and `SFProductPromotionSelectionModal` listening for the selected size on an event `SFVariantPicker` does not declare. Both bound `:active-variant` and `@update:model-value`, while the picker's model is `activeVariant`. The selection only arrived because Vue passed the undeclared listener on to the picker's inner `SFDropdown`, so declaring that emit or setting `inheritAttrs: false` on the picker would have silently stopped the size selection on the product detail page and in the gift selection. Both now use `v-model:active-variant`, which binds the picker's declared model, as the `:active-variant` and `@update:active-variant` pair in `SFBasketVariantSelector` already did.
- **\[Performance\]** Fixed two Inertia controllers to follow the `lazyPromise` convention. The PLP's CMS content fetch and the basket's promotions fetch were both created eagerly, so a partial reload of an unrelated prop still triggered them. The basket's promotions fetch also had no failure handling. A promotions-service outage now degrades to an empty promotions and gifts payload instead of failing the whole page.
- **\[Performance\]** Stopped sending `fetchpriority="high"` on the checkout and subscription web component script tags. Both tags are appended from `onMounted`, after the early load window a priority hint applies to, so the hint bought nothing and only made the scripts bid for bandwidth against the page's own LCP resource. On the basket page and the PDP that resource is a product image.

  `Layout.vue` and `SimpleLayout.vue` now emit a `preconnect` to the checkout host on the four pages that load the checkout script (`Basket`, `ProductDetail`, `SignIn` and `Checkout`), which recovers the handshake latency without competing for bandwidth.

  Both tags also dropped `script.defer = true`. `defer` has no effect on a script that is not parser-inserted, so removing it changes nothing at runtime.

- **\[Performance\]** Lazy-loaded each CMS provider's `RichTextComponent` so the rich-text renderer (`@storyblok/richtext` with its TipTap and ProseMirror dependencies, `@contentful/rich-text-html-renderer`, `@contentstack/utils`) ships only when a page renders a rich-text block. The component is wrapped in `Suspense`, so SSR still awaits it and the content stays in the server-rendered HTML.
- **\[Performance\]** Moved the `compress()` middleware in the server entry ahead of every other middleware, directly below the health route, so it now also covers the responses of `serveStaticAssets`.

  The middleware previously sat below `nosniffMiddleware`, `serveStaticAssets` and the OpenTelemetry middleware, so built assets were served uncompressed while pages and API responses were compressed. In a production build, the entry chunk for the account profile page went out as 85 KB with no `Content-Encoding`. It is now gzipped and carries `Vary: Accept-Encoding`.

  This only affects a production build. `serveStaticAssets` is a no-op under `vite dev`, where Vite's own middleware answers every asset request before it reaches the Hono app, so local development is unchanged. Deployments serve assets from an S3 bucket rather than from the application, so the gain lands on `pnpm preview` and on any container that serves its own assets.

  Responses that already reached the compression middleware are unaffected. The health route stays above it and remains uncompressed.

- **\[Performance\]** Lazy-loaded the Contentstack Visual Builder. `@contentstack/live-preview-utils` was forced into the eager `cms-contentstack` chunk via `manualChunks`, which shipped the editor-only Visual Builder (plus preact) to every visitor. Removing it from the group lets the editor-only dynamic import emit it as a lazy chunk that loads only in editor and preview sessions. The eager Contentstack content chunk that normal CMS pages download drops from 428 kB to 30 kB.
- **\[Performance\]** Switched deal impression visibility tracking to `useIntersectionObserver` from `@vueuse/core` instead of the `vElementVisibility` directive from `@vueuse/components`. `SFDealRibbon` and `SFDealBanner` were the only consumers of `@vueuse/components`, which pulled the separate 28.7 kB package into the eager bundle on every page. `@vueuse/core` is already bundled, so the dependency is dropped entirely.
- **\[Performance\]** Removed `isomorphic-dompurify` from the search highlight path. `highlightSearchTerm` runs on the eager header search, so importing the sanitizer pulled DOMPurify (73.8 kB raw) into the bundle loaded on every page. The highlighter only emits a static `<span class="font-semibold">` wrapper, so it now HTML-escapes every text segment itself instead of sanitizing. This keeps the eager bundle off the `isomorphic-dompurify` graph. CMS rich text still sanitizes via `sanitizeCmsHtml`, which only loads on route-split CMS pages.
- **\[Performance\]** Narrowed the product detail page fetch's `attributes: 'all'` selector on variants and siblings to only the attribute keys the product mapper reads. Variants now request `size` and the four subscription keys, and siblings request `name`, `brand`, and `color`. This reduces the SSR payload size for the product detail page, the Gift feature, and basket item mapping, which all share these includes constants. The variant and sibling fetch stays eager. Only the requested attribute set changed.
- **\[Performance\]** Limited the listing grid to a single `fetchpriority="high"` image and derived the eager-loading count from the grid it serves. `getProductImageLoading` drove both `loading` and `fetchpriority`, so the first five product cards each claimed `high`. The hint is relative, so five of them cancel out while still competing with CSS and fonts during the LCP window. Every product slider and the wishlist page inherited the same five, on pages whose LCP element is something else entirely. `fetchpriority` is now a prop the consumer passes, and only `SFProductGrid` passes it, to its first card. The single `high` of the homepage now goes to the CMS hero, which matches how `resolveImagePriority` already treats CMS images.

  Lowered `PRODUCT_IMAGE_EAGER_LOADING_COUNT` from 5 to 4. The grid renders 2 columns below 768px, 3 up to 1279px and 4 from 1280px, so 5 was a partial row at every width. Measured on a PLP, the cards touching the fold are 4 at 412x823, 6 at 768x1024 and 8 at 1350x940. `loading` is resolved during SSR with no viewport, so one number has to serve all three. 4 covers the whole mobile fold and the full first row of the widest grid without eager-fetching past the fold on the connections where that costs most.

- **\[Performance\]** Changed the SSR entry to pass a context object to `renderToString` and return the `modules` set that Vue fills, which names every component whose `setup` ran. `@scayle/storefront` maps those modules to client chunks and emits `modulepreload` hints for them, so the browser no longer needs a second round trip to discover the page component after the entry bundle evaluates. Measured with Lighthouse against a production build, the listing and product detail pages improved by 360 ms and 392 ms on FCP, and by 241 ms and 434 ms on LCP.
- **\[Performance\]** Limited Tailwind class detection to the shipped sources, which cut the production CSS from 110.4 KB to 103.9 KB minified (19.3 KB to 18.2 KB gzip).

  Tailwind's automatic detection scanned the whole project, including Storybook stories, tests, changesets and CMS content models, so production CSS carried classes only those files use. `src/client/index.css` now scans `src` only, without `*.stories.ts`, `*.test.ts` and `*.mdx` files. Storybook loads the new `.storybook/preview.css`, which adds the stories and the Storybook docs pages back, so every story keeps its styles.

- **\[Performance\]** Lazy-loaded the CMS product blocks so pages that do not contain them no longer download their code. Every page with any CMS block loads its provider's block dispatcher, and the dispatcher statically imported `ProductSliderComponent`, `SmartSortingProductsSliderComponent`, `RecentlyViewedProductsComponent`, and `SingleProductComponent`. That pulled the product card and slider trees onto every CMS page, whether or not the page rendered one of these blocks. All four now use `defineAsyncComponent`, matching how `RichTextComponent` was already loaded. The eager chunk set for a CMS page shrinks for Storyblok, Contentful, and Contentstack alike.

  The Contentful dispatcher also renders `ProductSliderComponent` inside `<Suspense>` now. It has a top-level `await` in `setup`, so it needed a Suspense boundary and was missing one.

- **\[PLP\]** Changed pagination links to navigate with a partial reload scoped to `only: ['products', 'pagination', 'meta']` instead of an `except:` list, matching sort and filter navigation. Pagination clicks no longer re-resolve basket, wishlist, navigation, footer, promotions, campaign, and CMS content server-side.
- **\[PLP\]** Fixed the product info box on listing page cards being taller than necessary on mobile. Its minimum height dropped from `min-h-36 lg:min-h-24` to `min-h-14`. The product card, basket summary, navigation, and error pages now use the shared Type Hierarchy utilities instead of one-off Tailwind type classes.
- **\[PLP\]** Fixed the English text on the empty product list and the empty search results page. It read "your filters doesn’t result in products" and now reads "your filters don’t result in products". The change applies to the `en-GB` and `en-US` locales.
- **\[PLP\]** Fixed a Vue hydration mismatch on the product listing page (mobile and desktop). The sort dropdown (`SFSortSelection`) marked the selected option via referential identity (`item === modelValue`), but `selectedSort` and `sortOptions` arrive as separate Inertia props and are deserialized into distinct objects on the client. The server rendered the selected highlight and checkmark while the client did not, producing a hydration mismatch on every PLP reload. `SFSortSelection` now resolves the selected option back to its entry in `sortOptions` by `key`, keeping the reference stable across SSR and client hydration.
- **\[Product\]** Fixed a hydration node mismatch on `SFProductCardInBasketBadge` when a product card renders inside an async CMS product slider, for example `SmartSortingProductsSliderComponent`. The badge reads the deferred `basket` shared prop (group `user-data`), which is absent during SSR but already resolved by the time a `<Suspense>`-wrapped subtree hydrates, so the first client render disagreed with the server HTML. The badge now waits for `useMounted()`, which forces the initial client render to match SSR. This matches the existing `promotions` guard in `SFProductCard`.
- **\[Product\]** Fixed a hydration mismatch in `SFProductCard`. Its `promotions` computed read a deferred Inertia prop before it had resolved on the client, so the first client render disagreed with the server-rendered HTML.
- **\[Product\]** Refactored `SFProductCard` to get its highlight state from the new `useProductCardHighlight` composable, so the highlight rules can be read and tested apart from the image, sibling and hover state of the card. Nothing changes on screen: a CMS override still wins over a page promotion that opts into card highlighting, and promotions still appear only after the card mounts, so the first client render matches the server HTML. The composable also returns the product's promotions and the resolved highlight, since the card passes both to its badges and footer.

  If your project changed the highlight logic in its copy of `SFProductCard`, move that change into `useProductCardHighlight`.

- **\[Product\]** Fixed the "+N" swatch link overflowing narrow product cards.

  The siblings picker on `SFProductCard` now decides how many swatches to show from the card's own width instead of the viewport width. Cards narrower than 13.625rem (218px), such as the two-column grid in the add-to-basket confirmation slide-in, show the current product, one sibling and a "+N" link. Wider cards, such as the product listing grid and product sliders, keep showing three swatches. The threshold leaves room for a two-digit "+N" text.

  The card's root element is now a named CSS container (`@container/product-card`), which makes it a stacking context and the containing block for `fixed` descendants. If your project adds a `fixed`-positioned element inside the card, consider rendering it outside the card, as it will now be positioned and layered relative to the card instead of the viewport.

  The container also stops the card from taking its width from its content. A parent that sizes the card from its content, such as a flex item without a width, `w-fit` or `inline-block`, now renders it 0px wide, so give the card a width there. If you override the card's root classes, keep `@container/product-card`, or the siblings picker always shows two swatches.

- **\[Promotions\]** Fixed Buy X Get Y gift rows on the basket page dropping gift promotions without a product rule (for example category or basket-value unlocks) and gift promotions outside the first page of active promotions. The rows now come solely from the Storefront API's `applicablePromotions`, and the basket controller no longer re-filters them against its own active-promotion page and a product-attribute match.
- **\[Promotions\]** Fixed the promotion banner of a free gift promotion showing the wrong text. It said the offer was still locked while the gift panel already invited the customer to choose a gift, and it asked for a gift again after the gift was in the basket. `SFDealBanner` now reads `isGiftPromotionApplicable` for free gift promotions.
- **\[Promotions\]** Fixed the deal badges and the "Already in basket" badge on product cards, which floated too high above the highlight promotion footer or overlapped it. The badges, the in-basket badge (`SFProductCardInBasketBadge`) and the footer now share one bottom-anchored flex column in `SFProductCard`. The footer is 22px tall (a `h-5` slim `SFDealTimer` plus `py-px` in `SFHighlightFooter`), and the badge column sits at `bottom-[22px]` so it rests directly on the footer. Without a footer, the column sits at the bottom of the image. The in-basket badge is the bottom row and sits flush to the right edge. The deal badges stack above it, or become the bottom row when the product is not in the basket. `SFProductCard` no longer looks up the basket to offset the badges, since the layout is plain CSS.
- **\[Promotions\]** Fixed the promotion code field in the basket sending a request for every double click and every key repeat of a held Enter key. `usePromotionCode` now ignores a repeat call while a code is being added, and does the same per promotion while one is being removed. `isApplying` and `isRemoving(promotionId)` put the add button and the remove buttons into the `loading` state, and the success toast now appears after the basket reload finishes.
- **\[Promotions\]** Fixed promotions showing their internal name or no label where the customer-facing display name belongs. `PromotionMapperService` now sets the promotion `headline` from `displayName` and falls back to the promotion `name` when `displayName` is empty as well as when it is `null`. The basket discount rows (`SFBasketSummaryPromotionsDiscounts`) and the price information modal (`SFPriceInfoModal`) now show the `headline` for promotions and campaigns, like the deal ribbon and deal banner. The basket summary mapper passes `headline` through `PromotionReduction` for this.
- **\[Promotions\]** Moved the mapping of applied promotion codes on the basket to the SDK `BasketMapper`. `BasketMapperService` no longer builds `promotionCodes` locally, and the `promotionCodes` field was removed from the application `declare module` augmentation on `Basket` because it now ships on the SDK type.
- **\[Promotions\]** Stopped the header promotion badge from flickering when switching shops.
- **\[Promotions\]** Fixed `useMOVPromotions` dividing by the minimum order value of the highest tier without checking it. A tiered promotion whose highest tier has a `mov` of 0 passes the `deal.tiers?.length` gate in `SFDealBanner`, so it reached the composable and put `NaN` on the progress bar, or `Infinity` clamped to a full bar for a non-empty basket, and on every milestone. Both divisions now go through one helper that reports `0` when there is no spend target, which also covers a promotion with no tiers at all.
- **\[Routing\]** Fixed the reply to a deferred props request so it no longer changes the page URL. Inertia requests each deferred group with the URL the page has when the request goes out, and the reply used to set the page URL back to that one, as a new history entry. A size picked on the product detail page before the replies arrived lost its `variantId`, so the size picker reset and the next click on add to basket opened the size list instead of adding the product. A page opened from a shared link fell back to the size in that link, and the image view on the product listing page lost its `imageView` parameter the same way. `main.ts` now registers `preserveUrlOnDeferredReload` from the router utilities as Inertia's `visitOptions` default, which turns on `preserveUrl` for every deferred props request.

  With `preserveUrl`, Inertia also leaves the history entry as it is when a deferred reply arrives. Back and Forward to a page with deferred props now request those props again, one request per deferred group.

- **\[Routing\]** Fixed links to products whose name has no Latin letter or digit, such as a Cyrillic, Greek, Chinese or Arabic name, or that have no name. `buildProductDetailRoute` built `/p/-42` for them, which the product detail route does not match, so every link to such a product answered 404. These products now link to `/p/product-42`. Links for products with a Latin name are unchanged.
- **\[Routing\]** Moved the SCAYLE Panel redirect middleware from the application entry onto the SSR router and registered it before the page controllers. Only page requests trigger a Storefront API redirect lookup now, since oRPC calls, the analytics route and static assets never needed one. The lookup also runs before the page renders, so a Panel redirect on a page that still exists, such as a product, category or content page, applies instead of being ignored. Panel targets are used as stored, as a path or an absolute URL, and an Inertia visit to an absolute target gets a full page load.

  Server redirects in the Storefront Application go through `inertia.navigate()`, which localizes the target for the active country and loads an external target as a full page. A search term that resolves to a product or category now redirects to the localized URL. Before, a search on `/at/search` redirected to `/c/shoes-1`, and the country middleware sent the user on to the default shop. A search navigation item that links to another domain opens with a full page load. The `/account` route and the sign-in controller no longer call `localizeLink` themselves.

  `useRoute().navigate` loads an absolute URL, or a URL on another origin, as a full page, the same way `SFLink` renders these links. Before, it handed them to `router.visit`, which fails on another origin because of CORS. `SFSearchField` uses it when a submitted search term resolves to a link. `replace: true` replaces the history entry for a full page load as well. A target whose scheme is not `http` or `https`, such as `javascript:`, throws instead of loading.

  An ESLint rule now rejects `ctx.redirect` in the controllers and in `ssr-routes.ts`. It sends a user in a non-default country to the default shop and fails on an external target, so use `inertia.navigate()` there.

- **\[RPC\]** Deferred SSR RPC client construction to the first procedure access. `createSsrOrpcClient` throws when the request carries no storefront context, and the plugin is installed on every server render, including the Error page, which renders precisely on requests that may lack one. Building the client eagerly during `install()` turned that into a second throw while the error handler was already unwinding, so the response lost the original error and reported a missing RPC context instead. A page that never calls a procedure now never constructs a client, and `useRpcClient()` is unchanged.
- **\[Search\]** Fixed a click on the search icon or the padding of `SFSearchField` not focusing the input. The field around the input is now a `label`.
- **\[Search\]** Fixed the search results page showing the category message when a search has no results. It said there were no products in this category and, for a search without filters, offered no button. The new `SFSearchNoResults` shows search tips, links to the homepage and to each main category of the header navigation, and keeps "Reset filters" when filters are applied. `SFProductGrid` takes it through a new `no-results` slot, which defaults to `SFProductListNoResults`, so category pages are unchanged. The category links reuse the `category_suggestion_list.title` label, which also heads the category suggestions in the header search and is now translated in the 23 locales that still showed English text.
- **\[Search\]** The search results page renders when the Storefront API search resolve fails. Resolve only decides whether a term redirects to a category or product page, but its failure used to answer the search with the error page and status 500. Submitting a term or using `Show all results` in the header search field ended there for as long as resolve kept failing. The search controller now logs the failure in the `search` namespace and renders the results without the redirect. A failing product search still answers 500.
- **\[Search\]** Fixed the search page showing the error page for a search term over 60 bytes or over 10 words, which the Storefront API rejects. The page now shows a hint to use a shorter search term instead of the results, without a result count, and does not report the term as a zero-result search. A long term without spaces wraps in the headline instead of overflowing. The hint uses the new `search_page.term_too_long` translation key. `SearchController` takes the decision from the `isTermRejected` hook of `BaseSearchController`, which a provider with other limits, such as Constructor, overrides.
- **\[Security\]** Escaped link attributes and validated the URL scheme before building `href` in the hyperlink renderers of the CMS `RichTextComponent`. The Contentful and Contentstack renderers previously put `href`, `rel`, and `target` into the generated HTML unescaped. A crafted CMS value could break out of the attribute (for example to inject a `style` attribute) before the HTML reached `sanitizeCmsHtml()`. Storyblok escaped its attributes but did not validate the link scheme. All three providers now use the shared `escapeAttr` and `hasSafeLinkProtocol` helpers, and `href` falls back to `#` for any URI scheme outside `http`, `https`, `mailto`, and `tel`.
- **\[Security\]** Stopped the report-only Content-Security-Policy from reporting violations for the navigation progress bar, the Usercentrics consent manager, the checkout web component's stylesheet and address form lookups, and the Klarna SDK that express checkout loads. Inertia's progress bar is now styled in `index.css`, and `includeCSS: false` in `main.ts` stops Inertia from injecting an inline `<style>` block. `connectSrc` now lists the hosts that the Usercentrics CMP, loaded from `web.cmp.usercentrics.eu`, calls. It replaces hosts of the previous CMP version that the CMP never contacts. `styleSrc` and `connectSrc` allow the checkout web component's CDN, and `scriptSrc` allows `https://x.klarnacdn.net`. The security headers doc no longer claims that the inline JSON-LD structured data needs a nonce, because JSON data blocks never execute and `script-src` does not apply to them.
- **\[Security\]** Changed every page to encrypt its browser history entry, and logging out now deletes the key. Before, the next person on a shared device could press Back after a logout and see the previous customer's orders, profile, checkout, or the customer and basket on any other page. A page Inertia can no longer decrypt is fetched from the server again, so the account pages redirect to sign-in. The Storefront Application registers `createEncryptHistoryMiddleware()` from `@scayle/storefront` on all of `ssrRouter`.
- **\[Security\]** Fixed markup in a page title running as script on the first server-rendered page load. The page title now goes through Inertia's `title` prop instead of a `<title>` child of `<Head>`. Inertia escapes the prop on the server but wrote text children into the HTML as they were, so a search term, a product name, or a CMS page title containing markup was not escaped.
- **\[Security\]** Closed an open redirect on the sign-in page. The `redirectUrl` target is now validated with `getSiteRelativePath` from `@scayle/storefront/shared` in both the sign-in controller and `useAuthentication`, replacing the previous `startsWith('/') && !startsWith('//')` prefix check. That check accepted `/\evil.com`, which browsers resolve to `//evil.com` and therefore off-origin. It was reachable under `STOREFRONT_COUNTRY_SELECTOR=path_except_default`, where `localizeLink` passes the default country's paths through unprefixed.

  Converted the sign-in page controller to a `SignInController` class that extends `BaseController` from `@scayle/storefront`, replacing the functional `signin.View` handler. The base class supplies `view()`, so the controller only declares `getTemplate()` and `getViewProps()`. The sign-in head meta is built inside the controller.

  Customers who are already signed in no longer see the sign-in form: `beforeRender()` redirects them to the site-relative `redirectUrl` the auth guard appended, or to the order history when there is none.

- **\[SEO\]** Fixed the basket, checkout and search results pages rendering a title without the shop name. `BasketController`, `CheckoutController` and `SearchController` now pass the title through `withShopName` like every other page, so the browser tab reads "Basket | YOUR SHOP" instead of "Basket". The basket and checkout pages also set a canonical link that drops query parameters such as `utm_source`, like the wishlist and sign-in pages. The `getMeta` method of these three controllers now returns a promise, so a subclass that overrides or calls it needs to await it.
- **\[SEO\]** Fixed the PLP robots meta tag and canonical link not updating on sort and filter changes. The `meta` prop is now included in the partial-reload `only:` arrays for sort selection and filter apply, so `<meta name="robots">` and the canonical link reflect the current sort and filter state without a full page reload.
- **\[ShopSwitcher\]** Hid the shop switcher in the header and mobile navigation when the Storefront has only one shop. `useShopSwitcher` now returns `hasOtherShops`, which is `false` when the current shop is the only one to choose from.
- **\[ShopSwitcher\]** Fixed the mobile shop switcher trigger using the primary text color instead of the secondary one, so it now matches the adjacent logout button.
- **\[ShopSwitcher\]** Fixed shop switching not fully applying when shops share a domain (`path` and `path_except_default` country selectors). `SFLink` now performs a full document navigation for any absolute URL, not just cross-origin ones. Before, an absolute same-origin shop-switch URL such as `https://shop/de` was handled as an Inertia client-side visit, so the application never rebooted. The oRPC client kept sending the previous shop's `X-Shop-Country-Id` header, which added wishlist and basket items to the shop visited first, and the UI language lagged behind the new shop.
- **\[Sorting\]** Fixed the product listing page staying on the same page number after a sort change, which skipped the first results of the new order, such as the cheapest products after "Price ascending". `useSorting` now drops `page` from the URL, so `SFSortSelection` and `SFMobileSortSelection` start the new order on page 1, as a filter change already did.
- **\[Sorting\]** Moved the sort navigation of `SFSortSelection` and `SFMobileSortSelection` into the new `useSorting` composable, instead of each defining its own `applySort`. Nothing changes on screen. If your project changed `applySort` in one of the two components, for example to reload another prop on a sort change, move that change into `useSorting`.
- **\[Tooling\]** Changed `pnpm format` and `pnpm format:fix` to pass `--ignore-path .gitignore --ignore-path .prettierignore`, so Prettier reads only the project's own ignore files. Both scripts run the experimental CLI of Prettier, which also applies the ignore files of every parent directory. When the project sits inside a directory whose `.gitignore` or `.prettierignore` matches it, for example an application folder in a monorepo, Prettier skipped every file and `pnpm format` passed without checking anything. If your project is the root of its own repository, the check already covered every file and the script change makes no difference for you.

  Reformatted the 154 files the skipped check had let through. The changes are formatting only, such as line breaks, trailing commas and parentheses, and change no behavior. `.prettierignore` also excludes local implementation plans, which are never committed.

- **\[Tooling\]** Pointed `prettier-plugin-tailwindcss` at `index.css` with the `tailwindStylesheet` option, so Prettier sorts classes against the application's own theme. Custom classes such as `text-primary`, `focus-style`, and `heading-page` now sort to the same position as the Tailwind utilities they extend, instead of the front of the class list. Class lists across the application were re-sorted. If your fork changes `index.css`, run `pnpm format:fix` after merging this release so your class lists follow the new order.
- **\[Tracking\]** Fixed lost deal impression and click tracking when the active promotions cannot be fetched.

  The `promotions` shared prop was the only deferred prop in `sharedDataMiddleware` that called the Storefront API without error handling, so a failure rejected its resolver. Inertia drops a rejected deferred prop from the partial-reload response, which left `page.props.promotions` undefined for the rest of the page view. Every surface that derives a deal placement from it (the product detail page banners, the basket banners, and the deals overview slide-in) then reported an unknown deal set size. `useDealTracking` held the impression indefinitely while `onSelect` swallowed clicks. Neither GA4 nor SCAYLE Analytics received the event.

  The resolver now catches the error, logs it, and falls back to an empty array, like the `basket` and `wishlist` props beside it already do. The deal set size is known again, so a campaign banner rendered next to a failed promotions fetch reports itself as the only deal on the surface instead of going untracked.

- **\[Tracking\]** Fixed `view_promotion` events for the deals panel banners that fired on the destination page after a customer selected a deal. The panel closes on navigation, but its banners kept counting as visible, so the events carried the destination `page_path` for deals the customer no longer saw.
- **\[Tracking\]** Fixed credentials in the address reaching GA4 or `localStorage`. A URL can carry a credential, such as the password reset `hash`, the order success `cbd` or an `#access_token=` redirect. GTM forwards `page_location` to GA4, and the SCAYLE Analytics session keeps the referrer in `localStorage`, where every script on the page can read it.

  - `page_location` now keeps only the query keys on the tracking allowlist in `tracking.ts` and drops the fragment. The allowlist holds `page`, `sort`, `filters[<slug>]`, `variantId`, `imageView`, `register`, the five `utm_*` keys and the ad click ids. `hash`, `cbd`, `transactionId`, `redirectUrl`, the CMS preview keys and every other key stay out. If your shop adds a query parameter of its own, add it to `TRACKED_QUERY_KEYS` once it is safe to track. If your ad platforms differ, edit the click ids there.
  - The session `referrer` and `context.referrer` are now cut at the first `?` or `#`. A session stored before this change keeps its unfiltered referrer until it ends.
  - GTM's own History Change trigger still pushes `gtm.oldUrl` and `gtm.newUrl` with the full address. Leave that trigger out of your container, since the plugin already fires `page_view` on every navigation. `docs/GA4-TRACKING.md` lists what the plugin cannot filter.

- **\[Tracking\]** Fixed pressing and holding a link in the mobile navigation pushing a GA4 `page_view` for the current page. The link prefetches its target on press, and the GA4 plugin counted the prefetch request as a visit. The plugin now watches the Inertia page URL instead of Inertia's request events. The `page_view` fires once the user lands on the new page, including when that visit is served from the prefetch cache, which previously pushed no `page_view` at all.
- **\[Tracking\]** Fixed the order success page sending the GA4 `purchase` event again on every reload, revisit or back navigation. `useOrderEvents` now remembers the ids of the orders it has sent in session storage and skips an order it already sent in the same tab. The id is only stored with `google-analytics` consent.
- **\[Tracking\]** Fixed the GA4 `add_to_wishlist` event from a product card so it reports the 1-based list position in `ecommerce.items[0].index`, matching `select_item`. The first card in a list used to report `0`.

- **\[Translations\]** Fixed the Portuguese label of the link back to the shop in `SFSimpleHeader` on small screens. It read "to buy" instead of "Back to shop", and now uses the same text as the label on larger screens.
- **\[Types\]** Enabled `noUncheckedIndexedAccess` in `tsconfig.json`. Array and record reads such as `items[0]` are now typed `T | undefined`, so a missing element is a type error instead of a crash at runtime. It applies to application code, tests and stories alike, and the CMS provider typechecks inherit it. Fixing the findings also corrected the sort option labels. A sort option from a listing provider with its own keys now shows the provider's label instead of an empty one.
- **\[Types\]** Consolidated Panel custom data augmentations into `customData.ts` (`ShopCountryCustomData`, `PromotionCustomData`, `NavigationItemCustomData`) and typed the `customData` access in the navigation mapper without casts.
- **\[UI\]** Made accordion headers easier to hit, especially on touch devices. The clickable header used to be only the title line, 28px high. A closed accordion now opens from anywhere in its row, including the padding around the title and, in the two-column layout, the empty right half, which matches the area the hover background covers. An open accordion closes from its header, which is now at least 48px high with the title centered in it. This applies to `SFAccordion` and every accordion built on it, such as the product detail page sections and the CMS accordion blocks.
- **\[UI\]** Fixed the check mark of a checked checkbox disappearing when the checkbox has keyboard focus. The global `focus-style` utility raises the focused input to `z-index: 1`, so in `SFCheckboxBase.vue` the input's filled background painted over the check mark icon. The icon now carries the same `z-index` and, coming after the input in the DOM, stays above it without rising over surrounding content.
- **\[UI\]** Fixed the option list of `SFDropdown` opening outside the visible area on desktop, for example on the size picker of a product detail page with several promotion banners. The list used to always open below the trigger. It now opens above the trigger when it does not fit below. When it fits on neither side, the page scrolls until the list is in view. Inside a modal or slide-in the page stays where it is.

  The positioning logic moved from `SFDropdown` into the new `useDropdownPosition` composable. If your project changed `calculateDropdown` in its copy of `SFDropdown.vue`, move that change into `useDropdownPosition`. The composable also fixes the panel's scroll and resize listeners. They exist only while the panel is open and are removed when the dropdown unmounts, where they used to stay attached to `window`. A dropdown that is open on mount gets them too, so its panel follows the page on scroll and closes on resize.

- **\[UI\]** Fixed the size picker highlighting an unselected size when the selected size is sold out.

  `SFDropdown` marked the first available option as active when it opened with a disabled selection, so that row looked selected while the radio sat on the sold-out size. Now no option is highlighted on open in that case. ArrowDown moves to the first option and ArrowUp to the last one, Enter and Space no longer pick the first available size until one is highlighted, and Tab closes the list without picking.

- **\[UI\]** Fixed the product slider navigation arrows not aligning to the right edge on mobile. On the product detail page, `SFProductSlider` positioned the arrow container at `right-6` on mobile but `right-2` on desktop, so the arrows sat further from the right edge on small screens than the content edge of the product cards. The card gutter (`pr-4`) and the content edge of the slider are identical across breakpoints, so the mobile-only offset had no reason. The arrows now use `right-2` at every breakpoint and line up with the right edge of the cards on mobile.
- **\[UI\]** Changed `SFProductSlider` to render its scroll container as the product list itself. Before, the cards sat in a nested `<ul class="contents">` inside the scroll container `<div>` of `SFItemSlider`. `SFItemSlider` takes a new `sliderRefNodeType` prop (`'div'`, `'ul'` or `'ol'`, default `'div'`) that sets the element of its scroll container, and `SFProductSlider` passes `'ul'`. Other sliders keep rendering a `<div>`.

  The focus handling finds the list from the `relatedTarget` of the focus event instead of a template ref. The Shift+Tab handler that moves focus from the first card to the "Skip to end" button is bound to each card's `<li>` through `@keydown.shift.tab`, so keydowns in the slider header and arrows no longer reach it.

- **\[UI\]** Aligned `SFBreadcrumb` with the finalized Figma spec. With `lastAsCurrent` set, the current crumb renders as a non-interactive item with a rounded light gray background and an optional secondary `(N items)` meta suffix.

  `SFBreadcrumbItem` gained an optional `meta?: string` field used by the current crumb.

- **\[UI\]** Aligned the basket, wishlist, order-success, and account-orders empty states with the rest of the Storefront Application. The headline now uses `heading-section-1` (matching the filled-page titles) instead of the larger `heading-page`. Removed the redundant `py-10` on the empty-state container so the block no longer stacks extra vertical padding on top of the page wrapper's `py-8`.
- **\[UI\]** Removed the redundant "OK" action from toasts. Toasts are dismissed via the close icon, so the duplicate "OK" button is gone from the profile personal-information, password-management, and express-checkout notifications. Also removed the unused `CONFIRM` toast action from `useToast` and the now-unused `notification.confirm` translation key across all locales.
- **\[UI\]** Aligned filter and search UI details on the product listing page.

  - Aligned the label and counter of the mobile filter and sorting toggle button with flexbox.
  - Switched the search suggestions counter to the shared `SFCountBadge`, matching the filter toggle and header utility icon counters.
  - Matched the search suggestions breadcrumb divider and label color (`#666666`) to the main breadcrumb component.
  - Routed the "all filters cleared" notification through the shared toast system (`useToast`) instead of a bespoke inline banner, and moved the toast container into the browser's top layer so toasts render above open slide-ins (filter, promotion, shop switcher).

- **\[UI\]** Changed the product image background to `#F4F4F5` and moved it behind a dedicated `--color-product-image-background` design token, so the backdrop can be restyled without touching the shared `gray-100` palette step.
- **\[UI\]** Removed the rounded top corners from the mobile slide-in panel (Filters, Deals, and other off-canvas panels) so the edges are square. Desktop still uses rounded corners.
- **\[UI\]** Made inline validation messages below form fields text only again. Removed the alert icon from `SFValidatedInputGroup`, `SFDropdown` error helper text, and `SFCheckbox` error text so message length no longer shifts the layout.
- **\[Wishlist\]** Fixed the wishlist grid showing 3 products per row on screens wider than 1280px. The PLP and search results grids show 4 per row. The wishlist page builds its grid inline in `Wishlist.vue` instead of reusing the shared `SFProductGrid` component, and its responsive breakpoints (`lg:col-span-4`) had drifted from those of `SFProductGrid` (`md:col-span-4 xl:col-span-3`). Both grid item classes now match `SFProductGrid`.

  Also fixed the same drift in `SFProductGridSkeleton`, the PLP and search loading fallback. It still used `lg:col-span-4` with no `md` and `xl` split and rendered 3 columns per row at every breakpoint, which caused a layout jump once the real grid loaded.

- **\[Wishlist\]** Changed `useWishlist().toggleItem` to read the `action` field of the `wishlist.toggle` result to report whether the product was added or removed. The `wishlist.add` and `wishlist.toggle` oRPC routes of `@scayle/storefront` now accept optional `customData` and `itemGroup` and pass them to `WishlistService`, mirroring `basket.add`.

  `useWishlist().hasProductInWishlist` and `toggleItem` stay group-agnostic. They match and toggle on product id alone, since the Storefront Application never sends an `itemGroup`. If you add grouped wishlist lines, scope both by item group id. Otherwise a grouped line fills the toggle while the toggle itself adds a second ungrouped line.
