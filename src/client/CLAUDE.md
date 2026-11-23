# CLAUDE.md — Client

## Design System

- Tailwind CSS v4 utilities only. NEVER use scoped CSS or CSS modules. There are zero `<style>` blocks in `src/client/`.
- Vendor pseudo-elements use an arbitrary variant (`[&::-webkit-search-cancel-button]:hidden`). For a runtime value, set a custom property inline and read it from the utility (`SFProgressBar.vue`):

  ```vue
  <progress :class="PROGRESS_FILL" :style="{ '--progress-color': color }" />
  ```

- Tokens are `@theme` values in `design-tokens.css`. Use them instead of arbitrary values (`w-[200px]`). Use an arbitrary value only when no token exists, and say why.
- `hover:` already applies only on hover-capable devices.
- Focus ring: defined once as the `focus-style` utility and applied by the global `*:focus-visible` rule. No per-component `:focus-visible` colors, widths or offsets, and no `outline-none` / `shadow-none`. It is a two-tone band because no single tone meets WCAG 2.2 SC 1.4.11 on every surface. Under an `overflow-hidden` ancestor use `focus-visible:focus-style-inset`, the only sanctioned deviation. Prefer `focus-visible:` over `focus:`. Additive treatments on top of the ring (a background change) are fine.
- `sr-only` for screen-reader-only content. Guard motion with `motion-safe:` / `motion-reduce:`. `animate-pulse` needs no variant, `index.css` disables it under reduced motion.
- Class order: layout, box model, typography, visual, state and responsive variants. Move long variant-heavy lists into a named constant.
- Typography: use the `heading-*`, `body-*`, `disclaimer` utilities in `index.css` and `SFLabelValue` / `SFHint`. No one-off type classes. Pick the visual level from design, the tag from the document outline (Storybook `UI/Core/Typography`). CMS `RichTextComponent` renders with `v-html`, so keep generated tags on the same utilities.

## Components

- `SF` prefix, multi-word names, always `<script setup lang="ts">`. Pages and layouts are exempt from `vue/multi-word-component-names`.
- Prefer `ref()` over `reactive()`. Reserve `reactive()` for objects that need deep reactivity at the root.
- Few watchers. Before adding one, in order: use a `computed` (a watcher that only assigns a ref is one), use the template, do the work in the event handler. When a watcher is right (syncing outside Vue, an imperative API, navigation), watch `() => obj.field` with an explicit source, not `deep: true` or `watchEffect`.
- Props: destructure with inline defaults on `defineProps` (`SFDropdown.vue`). `withDefaults()` only when a default cannot be inline.
- i18n: use `$t('key')` in templates without `useI18n()`. Call `useI18n()` and `t()` only when the script needs translations.
- Emits: `defineEmits<{ ... }>()` for typing. Use `$emit(...)` in the template, and `const emit = ...` only when the script emits.
- `v-if` over `v-show` except for frequent toggles. Every `v-for` has a unique `:key`, never the index unless the list is static and unfiltered.
- No barrel imports. Import from the source file.
- Variants and sizes are `as const` objects in `utils/constants.ts` (`Size`, `ButtonVariant`), not `enum`s. Derive the type with `(typeof X)[keyof typeof X]`.
- Every component gets colocated tests and a story:
  - Stories (`*.stories.ts`, `storybook-vue-stories` skill): the `title` mirrors the path under `components/` (`UI/Core/SFButton`, `Product/Detail/Product Gallery/SFProductGallery`, `CMS <Provider>/<Block>`).
  - Tests (`*.vue.test.ts`): `@vue/test-utils` `mount()` with happy-dom, stubbed children, `@test/mocks/vue-i18n` (pass its `t` as `$t`), `data-testid` queries, composables mocked at module level. Shared mocks and stubs live in `src/test/`.
- `components/ui/core/` is pure presentational, slot-based, no business logic. `components/ui/` holds composites. Domain components sit in `components/<domain>/`. `components/meta/` renders SEO meta.

## Pages & Layouts

Pages are in `pages/`, layouts in `layout/` (`Layout.vue`, `SimpleLayout.vue`). Pages get typed props from the controller through `defineProps<Props>()`. Deferred props use `<Deferred>` with a fallback. API: `inertia` skill. Server rules: `src/server/CLAUDE.md` (Page prop rules).

- A deferred prop is `undefined` until it resolves. Declare it optional. Predicates and getters that read one return `boolean | undefined` (or `T | undefined`), so the loading branch stays visible.
- Renaming a deferred prop means updating every `only:` array and `<Deferred>` `:data` here. Nothing fails to compile.

## Composables

- State (`useBasket`, `useWishlist`, `useAuthentication`) reads Inertia shared data and mutates via oRPC (`useRpcClient()`). UI behavior composables hold reusable interactions. Keep domain logic minimal, business logic belongs on the server.
- Read page props with `usePage` from `composables/usePage.ts`, never `@inertiajs/vue3` (ESLint enforces it, stories are exempt because they mock the aliased module). Inertia types `Page['props']` with an index signature, so a misspelled prop resolves to `unknown`, the wrapper does not. Shared props need no type argument. Page props name their pages: `usePage<'Search' | 'ProductListing'>()`, typed from `Components` in `src/shared/types/global.d.ts`, and always optional.
- A composable must not import another composable whose value its callers already hold. Accept the value as a parameter.
- Module-scope state (refs outside the exported function, one instance for all callers) needs three things the compiler won't ask for:
  1. Guard every write with `import.meta.env.SSR`. The server shares module scope across requests, so a write leaks into the next visitor's HTML.
  2. Return it `readonly` / `shallowReadonly`, so callers can't bypass the guard.
  3. Decide what resets it. It outlives Inertia navigation and layout unmounts, so page- or layout-scoped readers need their own reset.
- State only needed while a caller is mounted: `createSharedComposable` from `@vueuse/core` (`useWishlist`). It gives every server-side call its own instance, drops it when the last caller unmounts, and runs with the first caller's arguments only. State that must outlive callers stays at module scope (`apiInitialized` in `useCheckoutWebComponent`).
- Page-scoped values: read page props directly (`usePage<'ProductDetail'>().props.x`) instead of module-scope state. It is `undefined` off that page and resets on navigation.

### Tracking (`composables/tracking/`)

One composable per event family (`useBasketEvents`, `useProductEvents`, `useSearchEvents`, `usePromotionEvents`, `useWishlistEvents`, `useAuthEvents`, `useCheckoutTracking`, `useOrderEvents`, `useDealTracking`, `useGlobalEvents`) on top of the `useTracking` primitive. Event names, payloads and context fields: [docs/GA4-TRACKING.md](../../docs/GA4-TRACKING.md) and [docs/SCAYLE-ANALYTICS.md](../../docs/SCAYLE-ANALYTICS.md).

- Pages and components MUST use the matching event-family composable. Never build a tracking payload inline or call the push API directly, that is how GA4 payloads drift from the tracking concept.
- `useAnalytics` (SCAYLE Analytics) sits next to `useTracking` (GA4). An event-family helper calls both explicitly at the call site, nothing links them. `plugins/analytics.ts` owns the consent gate, client context, session (`plugins/analyticsSession.ts`) and delivery to `POST /api/analytics/events`.
- `view_page` fires from the analytics dispatcher on every Inertia URL change (query included, `imageView` excluded). `useGlobalEvents().trackPageView` fires the GA4 `page_view` only (from the GA4 plugin's own watch of the page URL, same rule) and never `view_page`. The GA4 plugin resolves `useGlobalEvents` per page view, not at install, so the two plugins don't depend on install order. Keep the two triggers apart.
- A basket event reports the delta as `quantity`, not the resulting line quantity. `useBasket().updateItemQuantity` and `changeItemVariant` fire the events. The add and remove mutations leave it to the caller, so each interaction has one call site.
- A list impression fires once per list. Grids declare their surface through the required `productListType` prop (`SFProductGrid`, `useProductListTracking`, `SFWishlistToggle`). Sliders report `product_slider` and take an optional `productListId` from `ProductSliderIds`. `mapSurfaceToItemList` derives the GA4 list name and id.
- Each promotion helper fires its GA4 and SCAYLE Analytics event in one call, so the once-per-deal impression guard covers both. SCAYLE Analytics `position` counts across all pages and pairs with the list `total`, GA4 `index` stays page-relative.
- Search suggestion events take the `entries` list that `useSearchSuggestionNavigation` builds with `flattenSearchSuggestions` (`utils/search.ts`), so `position` matches the dropdown and the selected suggestion is found by identity. A link longer than `ANALYTICS_MAX_PATH_LENGTH` is skipped, not the whole dropdown.
- `getDealPlacement` (`utils/promotion.ts`) returns `undefined` while promotions are deferred. `useDealTracking` holds the impression until it resolves.
- Analytics-only payload mappers live in `utils/tracking.ts`. Helpers the UI also uses stay in their domain module.

### Overlays (`useOverlay`)

A modal, slide-in or popover that starts closed is an overlay. Create it with `useOverlay().create()` instead of rendering it in the template. The server renders nothing, the browser hydrates nothing, and the code is a separate chunk. `SFOverlayHost` mounts it on first open and keeps it.

```typescript
const { triggerAttrs, toggle } = useOverlay().create(
  () => import('@client/components/filter/SFFilterSlideIn.vue'),
  { props: () => ({ filters: props.filters }) },
)
```

```vue
<SFFilterToggleButton v-bind="triggerAttrs" @toggle="toggle" />
```

- The component has an `open` model (`defineModel('open')`), may emit `close`, and puts the passed `id` on its root.
- Pass page data through the `props` getter, not a snapshot, so partial reloads update an open overlay. The host renders outside page and layout, so `inject()` fails. `usePage()` works.
- Bind `triggerAttrs` on the opener (`aria-expanded`, `aria-controls`, `aria-busy`, preload on `pointerenter` or focus). Give it `aria-busy:animate-pulse aria-busy:cursor-progress motion-reduce:aria-busy:opacity-50`. Keep the opacity behind `motion-reduce:`, or it flattens the pulse.
- `preload: 'idle'` for panels most users open (mobile sidebar below `lg`).
- The overlay is removed when its creator unmounts. Share one across components with `createSharedComposable` (`useMobileSidebar`).
- Tests: `createOverlayTestPlugin()` from `@test/utils/overlay`.
- The host is last in keyboard order. Modal `<dialog>`s move focus themselves. For a popover bind `v-popover="{ open, source }"` with the trigger as `source`.
- Keep content crawlers need (category links) out of overlays, it is not in the server HTML.

### Lazy-mounting heavy components

For a non-overlay component that is expensive and only needed after an interaction (gallery zoom, add-to-basket confirmation), use `defineAsyncComponent` plus a `hasOpened*` ref that flips to `true` on first open and stays `true`:

```vue
<SFHeavyThing v-if="hasOpenedThing" v-model:visible="isOpen" />
```

- Keep the gate. Without it SSR runs the component's `setup()` and preloads its chunk, which defeats the point. It also keeps the component mounted so its exit transition survives. A component whose `v-if` is always false during SSR (`SFSearchField` suggestions) needs no gate.
- Don't use it for content that must be in the initial HTML. The first open has no loading state.
- When the open state lives in a module-scope composable, the `hasOpened*` ref dies with its layout while the state survives navigation. After a move from `Layout` to `SimpleLayout` with state `true`, a non-immediate `watch` never fires and the component never mounts again, with no error. Reset the shared state on unmount (preferred), gate on state that survives, or use `{ immediate: true }`.

## Plugins, directives, constants

- `plugins/`: installed in `main.ts` / `ssr.ts` (`tracking`, `analytics`, `consentManager`, `notification`, `overlay`, oRPC clients `orpcBrowser` / `orpcServer`). `directives/`: `dialog`, `popover`.
- `constants/index.ts`: constants in a family share a unit and suffix (`SECOND_MS`, `DAY_MS`). Stories, tests and fixtures import production constants, never a copy.

## CMS (`cms/`)

`cms/providers/<provider>/` holds each vendor's block components, composables, editor bridge and `plugin.ts`. `cms/shared/` is provider-independent. Import the active provider through `@cms-client` (Vite rewrites it from `CMS_PROVIDER`). `providers/scayle/` is the placeholder fallback when `CMS_PROVIDER` is unset. Each provider has a `<Provider>BlockDispatch.vue` mapping block types to components.

## Navigation

Use `navigate` from `useRoute()` for programmatic navigation. It adds the country prefix in path mode and loads absolute or external URLs as a full page, like `SFLink` (an Inertia visit to another origin fails CORS).

```ts
const { navigate, path } = useRoute()

navigate(routes.basket, { replace: true })
navigate(`${path.value}?sort=price`, {
  preserveState: true,
  only: ['products'],
})
```

- Never call `router.visit()` directly or wrap targets in `localizeLink(...)` for visits. Only `useRoute` calls `router.visit`.
- Templates use `SFLink` (or Inertia `<Link>`). Canonical URLs use `localizeLink` from `@scayle/storefront/shared`. Server redirects: `src/server/CLAUDE.md` (Redirects).
- `router.reload`, `router.replace`, `router.on` stay valid for partial reloads, query-only updates and global listeners. Use `partialReload()` from `utils/router.ts` for coalesced reloads on a shared `only` list.

## Accessibility

- Semantic HTML first (`button`, `nav`, `main`, `section`). Descriptive `alt` on images. One `h1` per page and no skipped heading levels.
- ARIA only where HTML is not enough. Link form errors with `aria-describedby`, set `aria-invalid`, associate labels with `for` / `id`.
- Contrast: WCAG AA through `design-tokens.css` tokens. Never use color alone to convey information.
- Product-card quick add is pointer-only by design (hover panel, `tabindex="-1"`, `aria-hidden`). Keyboard users use the PDP. Check that the add-to-basket slide-in takes focus, traps it and is fully operable.
- Skip links for keyboard users. Focus visibility comes from the global ring.

## SVG Icons

Icons in `assets/` import as Vue components via `vite-svg-loader`. SVGO optimizes them.

## SSR

`main.ts` is the browser entry, `ssr.ts` the server one.

- Guard `window`, `document`, `localStorage`, `navigator` with `import.meta.env.SSR` (or `typeof window === 'undefined'` in plugin `install`), `tryOnMounted`, or `useMounted`. Vite does not define `import.meta.client`.
- Prefer VueUse (`useNow`, `useIntervalFn`, `useMounted`, `useEventListener`) over hand-rolled timers. Composables that drive timers or read `Date.now()` must be inert on the server, or the HTML mismatches.
- Keep both `renderToString` wrappers in `ssr.ts` (`traceSsrRender`, `withModulePreloads`) and the `modules` return. Removing one fails no test and silently loses the span or a round trip per page. `ssr.ts` adds the active locale file to `modules` because `main.ts` mounts only after that chunk loads.
- Client code (composables, components) stays in the application, never an SDK package.
