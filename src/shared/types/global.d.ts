/**
 * Side-effect imports for every module that augments an SDK type. Several of
 * them export nothing of their own, so this is the only place that keeps their
 * `declare module` blocks in the program.
 */
import './customData'
import './Basket'
import './Customer'
import './Navigation'
import './Product'
import './Promotion'
import './ShopConfig'
import type { SharedProps } from '@scayle/storefront'
import type {
  Wishlist,
  AvailableCountry,
  AvailableLanguage,
  ShopSuggestion,
  Basket,
  Customer,
  Campaign,
  Promotion,
  NavigationItem,
} from '@scayle/storefront/types'
import type { CMSEditorData } from '@scayle/storefront/cms'
import type { AllowedComponentProps, Component, VNodeProps } from 'vue'

/**
 * Extracts the props a Vue component declares, dropping the attributes Vue
 * adds to every instance (`key`, `ref`, `class`, `style`, …).
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any -- `any` is needed so every component constructor matches the conditional
type ComponentProps<C extends Component> = C extends new (...args: any) => any
  ? Omit<
      InstanceType<C>['$props'],
      keyof VNodeProps | keyof AllowedComponentProps
    >
  : never

declare module '@scayle/storefront' {
  /**
   * Inertia shared data — the props every page receives on top of its own.
   * Populated by `sharedDataMiddleware` (`src/server/middleware/sharedData.ts`),
   * which is why `inertia.share()` accepts exactly these keys and nothing else.
   *
   * Page props from `ctx.render()` land in the same object, so the keys here
   * must not collide with any page's own prop names: a page prop shadows the
   * shared value under the same key, and the two declared types can then
   * disagree without the compiler noticing.
   *
   * `wishlist` is the one live collision: the wishlist page declares it as a
   * required, non-nullable page prop, which shadows the deferred shared value
   * for that page only. Do not copy the pattern for a new prop.
   */
  export interface SharedProps {
    /** Header navigation tree. Empty when the navigation fetch fails. */
    navigation: NavigationItem[]
    /** Footer link columns plus the legal row beneath them. */
    footer: {
      footer: NavigationItem[]
      bottomFooter: NavigationItem[]
    }
    /** Promotions currently running in the shop. Deferred, default group; absent while it resolves. */
    promotions?: Promotion[]
    /** Campaign currently running in the shop, `null` when none is active or the fetch fails. */
    campaign: Campaign | null
    /** Session basket. Deferred (`customer-data`); absent while it resolves, `null` when the fetch fails. */
    basket?: Basket | null
    /**
     * Signed-in customer, `null` once signed out. Deferred (group `customer`)
     * only on a cacheable page, and absent there while it resolves. Every
     * other page sends the customer with the page.
     */
    customer?: Customer | null
    /** Session wishlist. Deferred (`customer-data`); absent while it resolves, `null` when the fetch fails. */
    wishlist?: Wishlist | null
    /** CMS editor bridge context. Only present when the request is in editor or preview mode. */
    cmsEditorData?: CMSEditorData
    /** Countries the user can switch to, for the country selector. */
    availableCountries: AvailableCountry[]
    /** Languages available for the active country, for the language selector. */
    availableLanguages: AvailableLanguage[]
    /**
     * Shops to suggest for the country detected from `CF-IPCountry`. Deferred
     * (group `customer`); absent while it resolves, `null` when there is
     * nothing to suggest. The country switch prompt stays closed in both cases.
     */
    shopSuggestion?: ShopSuggestion | null
  }

  /**
   * Inertia page component props registry for server-side rendering.
   * Used to type `ctx.render('PageName', props)` calls. `ctx.render()` accepts
   * registered names only, so a page is renderable once it is listed here.
   * `Error` and `NotFound` are missing on purpose: `@scayle/storefront`
   * renders them and registers their props itself.
   */
  export interface Components {
    ProductDetail: ComponentProps<
      typeof import('@client/pages/ProductDetail.vue').default
    >
    ProductListing: ComponentProps<
      typeof import('@client/pages/ProductListing.vue').default
    >
    Basket: ComponentProps<typeof import('@client/pages/Basket.vue').default>
    /**
     * Also carries the `SimpleLayout` header props: Inertia passes page props
     * to the layout, and the checkout controller supplies them as page props
     * because `Checkout.vue` itself does not read them.
     */
    Checkout: ComponentProps<
      typeof import('@client/pages/Checkout.vue').default
    > &
      Pick<
        ComponentProps<
          typeof import('@client/layout/SimpleLayout.vue').default
        >,
        'shopName' | 'checkoutHeader'
      >
    Wishlist: ComponentProps<
      typeof import('@client/pages/Wishlist.vue').default
    >
    Search: ComponentProps<typeof import('@client/pages/Search.vue').default>
    SignIn: ComponentProps<typeof import('@client/pages/SignIn.vue').default>
    CmsPage: ComponentProps<typeof import('@client/pages/CmsPage.vue').default>
    OrderSuccess: ComponentProps<
      typeof import('@client/pages/OrderSuccess.vue').default
    >
    AccountProfile: ComponentProps<
      typeof import('@client/pages/AccountProfile.vue').default
    >
    AccountOrders: ComponentProps<
      typeof import('@client/pages/AccountOrders.vue').default
    >
    AccountOrderDetail: ComponentProps<
      typeof import('@client/pages/AccountOrderDetail.vue').default
    >
    AccountSubscriptions: ComponentProps<
      typeof import('@client/pages/AccountSubscriptions.vue').default
    >
    SubscriptionCancellation: ComponentProps<
      typeof import('@client/pages/SubscriptionCancellation.vue').default
    >
  }
}

declare module '@inertiajs/core' {
  /**
   * Bridges the shared-prop contract into Inertia's own `Page['props']`, so the
   * library's APIs (`<Deferred>`, `router.reload`, `props.initialPage`) see this
   * application's props.
   *
   * This interface merges with Inertia's own `PageProps`, which declares a
   * `[key: string]: unknown` index signature, so reading a misspelled key off
   * anything typed through it resolves to `unknown` instead of erroring. Client
   * code reads props through `usePage()` in
   * `src/client/composables/usePage.ts`, which returns the
   * index-signature-free `PageProps` from `@shared/types/PageProps` instead.
   */
  export interface PageProps extends SharedProps {}
}

export {}
