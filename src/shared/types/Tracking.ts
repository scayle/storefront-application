import type { PageComponentName } from '@scayle/storefront'
import type { ValueOf } from 'type-fest'

/**
 * Maps Inertia page component names to `page_type` values. The account pages
 * share one `account` value. `error`, `not_found` and
 * `subscription_cancellation` are outside the listed SCAYLE Analytics values,
 * which the specification allows as free-form strings.
 */
export const PageTypeSnakeCase = {
  ProductDetail: 'product_detail',
  ProductListing: 'product_listing',
  Basket: 'basket',
  Checkout: 'checkout',
  Wishlist: 'wishlist',
  Search: 'search',
  SignIn: 'sign_in',
  CmsPage: 'cms_page',
  OrderSuccess: 'order_success',
  AccountProfile: 'account',
  AccountOrders: 'account',
  AccountOrderDetail: 'account',
  Error: 'error',
  NotFound: 'not_found',
  AccountSubscriptions: 'account',
  SubscriptionCancellation: 'subscription_cancellation',
} as const satisfies Record<PageComponentName, string>

/**
 * `page_type` value of the GA4 context and the SCAYLE Analytics context: the
 * values in {@link PageTypeSnakeCase} plus `homepage`, which the shop's start
 * page reports instead of the CMS page it renders. Assigning a string outside
 * the union is a compile error.
 */
export type PageType = ValueOf<typeof PageTypeSnakeCase> | 'homepage'

/**
 * GA4 user classification.
 * Mirrors the values used by the SCAYLE tracking concept: a brand-new customer
 * is `new`, an authenticated customer with previous history is `returning`, and
 * unauthenticated sessions are `guest`.
 */
export type TrackingUserType = 'new' | 'returning' | 'guest'

/**
 * GA4 login state.
 * Sent as part of the tracking context on every event.
 */
export type TrackingLoginState = 'logged_in' | 'logged_out'

/**
 * Device classification for the tracking context, derived from the User-Agent
 * by `resolveTrackingDeviceType` in `@shared/utils/tracking`.
 */
export type TrackingDeviceType = 'ios' | 'android' | 'desktop'

/**
 * Slider ids the SCAYLE Analytics specification knows, sent as
 * `product_list_id` next to `product_list_type: 'product_slider'`. CMS product
 * sliders have no id in the specification and send none.
 */
export const ProductSliderIds = {
  SimilarProducts: 'similar_products',
  RecentlyViewed: 'recently_viewed',
  Trending: 'trending',
} as const

/** One of the {@link ProductSliderIds} values. */
export type ProductSliderId = ValueOf<typeof ProductSliderIds>

/**
 * GA4 `item_list_id` values for lists GA4 has to tell apart from another list
 * that reports the same SCAYLE Analytics surface. They replace the
 * `product_list_id` on the GA4 events only.
 */
export const TrackingItemListIds = {
  /**
   * The add-to-basket panel's recommendations. SCAYLE Analytics reports them
   * as the `trending` slider, but the panel opens over the PDP slider of the
   * same products, so GA4 would count that list twice.
   */
  AddToBasketRecommendations: 'add_to_basket_recommendations',
} as const

/** One of the {@link TrackingItemListIds} values. */
export type TrackingItemListId = ValueOf<typeof TrackingItemListIds>

export const TrackingEventNames = {
  PageView: 'page_view',
  ViewItemList: 'view_item_list',
  SelectItem: 'select_item',
  ViewItem: 'view_item',
  ViewPromotion: 'view_promotion',
  SelectPromotion: 'select_promotion',
  AddToCart: 'add_to_cart',
  RemoveFromCart: 'remove_from_cart',
  ViewCart: 'view_cart',
  AddToWishlist: 'add_to_wishlist',
  BeginCheckout: 'begin_checkout',
  AddShippingInfo: 'add_shipping_info',
  AddPaymentInfo: 'add_payment_info',
  Purchase: 'purchase',
  Login: 'login',
  SignUp: 'sign_up',
  Search: 'search',
} as const

/**
 * GA4 event names the Storefront Application pushes to the dataLayer.
 * `add_shipping_info` and `add_payment_info` come from the checkout web
 * components and reach the dataLayer through `useCheckoutTracking`. The
 * Storefront Application fires `login` and `sign_up` itself, because the
 * checkout web components never post them to the page.
 */
export type TrackingEventName = ValueOf<typeof TrackingEventNames>

/**
 * GA4-aligned tracking context carried by every event.
 * Built in the browser by the tracking plugin: the page fields when an event
 * is captured, the rest when it is pushed to the dataLayer, from the
 * `storefront` and `customer` props, the consent manager, `navigator` and the
 * SCAYLE Analytics browser session.
 */
export interface TrackingContext {
  /**
   * Unique consent-framework identifier, supports deletion requests. Absent
   * where the country requires no consent management, an empty string until
   * the consent platform reports.
   */
  consent_id?: string
  /**
   * SCAYLE Analytics session identifier, shared so GA4 and SCAYLE Analytics
   * events of one session can be joined. The session starts in memory at page
   * load, before SCAYLE Analytics consent and after a decline too, so the id
   * is absent only after a session ended and before the next page load or
   * SCAYLE Analytics event starts one.
   */
  session_id?: string
  /** SHA-256 hex of the customer id (`customer.idHash`), present only when authenticated. */
  user_id?: string
  /** Customer classification: `new`, `returning`, or `guest`. */
  user_type: TrackingUserType
  /** Login state: `logged_in` or `logged_out`. */
  login_state: TrackingLoginState
  /** Device category derived from `navigator.userAgent`. */
  device_type: TrackingDeviceType
  /** SCAYLE shop country identifier. */
  shop_country_id: number
  /** Shop key. */
  shop_key: string
  /** ISO 3166-1 alpha-2 country code served by the shop. */
  country_code: string
  /** Active session locale (e.g. `de-DE`). */
  locale: string
  /** Active currency (ISO 4217). Matches `currency` on ecommerce events. */
  shop_currency: string
  /** Application version, `config.version` from `storefront.config.ts`. */
  shop_version?: string
  /** Page classification (e.g. `product_detail`) of the page the event was captured on. */
  page_type?: PageType
  /** Path of the page the event was captured on. */
  page_path?: string
  /** Previous page path, set during navigation. */
  previous_page_path?: string
  /** Previous page type, set during navigation. */
  previous_page_type?: PageType
  /**
   * Path the SCAYLE Analytics session started on, without query or hash.
   * Absent like `session_id`.
   */
  landing_page_path?: string
  /** `utm_source` of the landing page query string. Absent like `session_id`, and when the landing page had none. */
  utm_source?: string
  /** `utm_medium` of the landing page query string. Absent like `utm_source`. */
  utm_medium?: string
  /** `utm_campaign` of the landing page query string. Absent like `utm_source`. */
  utm_campaign?: string
  /** `utm_content` of the landing page query string. Absent like `utm_source`. */
  utm_content?: string
  /**
   * External referrer of the session start, cut at its first `?` or `#`.
   * Absent for a direct entry or a same-origin one.
   */
  referrer?: string
  /** Customer segment flags, one per group the customer belongs to. */
  [key: `customer_segment_${string}`]: boolean
}

/**
 * GA4-aligned ecommerce item.
 * Money is emitted as decimal currency units (e.g. `29.99`). The cents-to-decimal
 * conversion happens in the client tracking mappers.
 */
export interface TrackingEcommerceItem {
  /** Stable product identifier (stringified product id). */
  item_id?: string
  /** Product display name. */
  item_name?: string
  /** Final unit price with tax, in currency units. */
  price?: number
  /** Number of units. Required for basket/checkout/purchase items. */
  quantity?: number
  /** 1-based position in the parent list. */
  index?: number
  /** Brand display name. */
  item_brand?: string
  /** Variant label (e.g. color or size) being interacted with. */
  item_variant?: string
  /** Stable variant identifier, if distinct from `item_id`. */
  item_variant_id?: string
  /** Category hierarchy, levels 1–5. */
  item_category?: string
  item_category2?: string
  item_category3?: string
  item_category4?: string
  item_category5?: string
  /**
   * Identifier within the list type (category id, search term, slider id,
   * promotion id), the SCAYLE Analytics `product_list_id`. Absent for a list
   * without one, such as the wishlist or a CMS product slider.
   */
  item_list_id?: string
  /**
   * List type (`category`, `search_results`, `product_slider`,
   * `gift_selection`, `basket`, `wishlist`), the SCAYLE Analytics
   * `product_list_type`. Set on list-context events.
   */
  item_list_name?: string
  /** Consolidated per-unit discount in currency units. */
  discount?: number
  /** Item-level coupon code. */
  coupon?: string
  /** Store/affiliation associated with the item. */
  affiliation?: string
}

/**
 * Ecommerce payload for GA4 tracking events.
 * Used in cart, checkout, and purchase events. Event-level monetary fields such
 * as `currency` and `value` are attached directly to the event object, not inside
 * this payload, except for `purchase` where they belong to the ecommerce block.
 */
export interface TrackingEcommercePayload {
  /** Items involved in the event (basket lines, listing entries, order positions). */
  items?: TrackingEcommerceItem[]
  /** Order identifier; set on `purchase` events. */
  transaction_id?: string
  /** Total monetary value of the event, in decimal currency units. */
  value?: number
  /** Currency of `value` and item prices (ISO 4217). */
  currency?: string
  /** Tax portion of `value`, in decimal currency units. */
  tax?: number
  /** Shipping cost, in decimal currency units. */
  shipping?: number
  /** Order-level promotion code applied to the event. */
  coupon?: string
}

/**
 * Complete GA4 tracking event payload pushed to `window.dataLayer`.
 * Combines the event name, shared context, optional ecommerce data, and any
 * event-level custom keys (e.g. `currency`, `value`, `search_term`).
 */
export interface TrackingEvent {
  /** Type of tracking event being sent. */
  event: TrackingEventName
  /** Shared tracking context. Injected automatically by the tracking plugin. */
  context: TrackingContext
  /** Optional ecommerce payload for cart, checkout, purchase, and listing events. */
  ecommerce?: TrackingEcommercePayload
  /** Additional event-level custom keys (e.g. `currency`, `value`, `coupon`). */
  [customKey: string]: unknown
}
