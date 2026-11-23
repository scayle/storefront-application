/**
 * Tracking payload mapping for both destinations: the GA4 `TrackingEcommerceItem`
 * shape pushed to the data layer and the flattened SCAYLE Analytics event shape.
 *
 * Everything in this module exists only to build tracking event payloads and is
 * consumed by the event-family composables in `composables/tracking/`. Domain
 * helpers that the UI also uses stay in their domain module (`utils/product.ts`,
 * `utils/search.ts`).
 */
import type {
  BasketItem,
  Campaign,
  DetailedProduct,
  ListingProduct,
  ProductPrice,
  ProductVariant,
  Promotion,
  SearchResolveResult,
  VariantPrice,
} from '@scayle/storefront/types'
import type {
  AnalyticsEventProduct,
  AnalyticsSearchSuggestionProperties,
  AnalyticsSuggestionType,
  CentAmount,
} from '@scayle/storefront-api'
import { localizeLink } from '@scayle/storefront/shared'
import type { PageProps } from '@shared/types/PageProps'
import type { TrackingEcommerceItem } from '@shared/types/Tracking'
import { toCurrencyUnits } from '@shared/utils/price'
import type { SearchSuggestionEntry } from './search'

/**
 * Maps a product or variant price to the GA4 `price` field on a tracking item.
 *
 * Money is emitted as decimal currency units (e.g. `29.99`). Discounts are computed
 * separately by `getTrackingDiscount`, so this helper only returns the final unit price.
 *
 * @param price The product or variant price to map.
 * @returns Mapped price for the tracking item payload.
 */
export function mapPriceToTracking(
  price: VariantPrice | ProductPrice,
): TrackingEcommerceItem {
  return {
    price: toCurrencyUnits(price.finalPriceInCents),
  }
}

/**
 * Computes the consolidated per-unit discount for a GA4 tracking item.
 * Returns `undefined` only when the price carries no reduction amount, so the field is
 * omitted from the payload. A reduction of `0` stays `0`.
 *
 * @param price The product or variant price whose `totalReductionInCents` is converted.
 * @returns Discount in decimal currency units, or `undefined` when the price has no reduction amount.
 */
export function getTrackingDiscount(
  price: VariantPrice | ProductPrice,
): number | undefined {
  return toCurrencyUnits(price.totalReductionInCents)
}

/**
 * Maps a variant to the GA4 `TrackingEcommerceItem` payload used by ecommerce
 * tracking events (`add_to_cart`, `remove_from_cart`, `view_cart`, `view_item`, ...).
 *
 * @param variant The variant to map.
 *
 * @returns Mapped ecommerce item fields for the variant.
 */
export function mapVariantForTracking(
  variant: ProductVariant,
): TrackingEcommerceItem {
  return {
    item_variant_id: variant.id.toString(),
    item_variant: variant.label,
    ...mapPriceToTracking(variant.price),
    discount: getTrackingDiscount(variant.price),
  }
}

/**
 * Maps a product into a GA4 `TrackingEcommerceItem` for view/select/basket events.
 *
 * Per-unit discounts are computed from the original vs final price. Brand and
 * category identifiers are omitted because they are not part of the GA4 item schema.
 *
 * @param product The product being mapped (PLP listing shape or PDP detail shape).
 *
 * @returns Mapped ecommerce item fields for the product.
 */
export function mapProductForTracking(
  product: DetailedProduct | ListingProduct,
): TrackingEcommerceItem {
  // Listing products carry no category trail: the listing includes request no
  // categories, which are expensive for the Storefront API to resolve.
  const categoryTrail =
    'breadcrumbs' in product ? product.breadcrumbs.slice(0, 5) : []

  return {
    item_id: product.id.toString(),
    item_name: product.name,
    item_brand: product.brand || undefined,
    item_category: categoryTrail[0]?.value,
    item_category2: categoryTrail[1]?.value,
    item_category3: categoryTrail[2]?.value,
    item_category4: categoryTrail[3]?.value,
    item_category5: categoryTrail[4]?.value,
    ...mapPriceToTracking(product.price),
    discount: getTrackingDiscount(product.price),
  }
}

/**
 * Maps the SCAYLE Analytics surface of a product to the GA4 list fields of an
 * item and its event: the list type is the `item_list_name`, the identifier
 * within it the `item_list_id`. Both pipelines name a list the same way, so a
 * GA4 list reads like the SCAYLE Analytics surface it pairs with.
 *
 * @param surface The `product_list_type` and `product_list_id` of the surface.
 * @returns The `item_list_id` and `item_list_name` fields, each absent where
 *   the surface has no value for it (the PDP surface is `null`, the wishlist
 *   has no id).
 */
export function mapSurfaceToItemList(
  surface: Pick<AnalyticsEventProduct, 'product_list_type' | 'product_list_id'>,
): Pick<TrackingEcommerceItem, 'item_list_id' | 'item_list_name'> {
  return {
    item_list_id: surface.product_list_id ?? undefined,
    item_list_name: surface.product_list_type ?? undefined,
  }
}

/**
 * Maps a basket item to the GA4 `TrackingEcommerceItem` payload used by
 * ecommerce tracking events (`add_to_cart`, `remove_from_cart`, `view_cart`).
 *
 * Reads all monetary values from the numeric cent fields the server mapper
 * populates on the basket and its items. Per-unit discounts are computed from
 * the line's unit price.
 *
 * @param item The basket item to map.
 * @param index Optional zero-based list index (used by `view_cart`).
 *
 * @returns Mapped ecommerce item ready to be included in an event payload.
 */
export function mapBasketItemToTracking(
  item: BasketItem,
  index?: number,
): TrackingEcommerceItem {
  const { product, variant, unitPrice } = item

  return {
    index,
    ...mapProductForTracking(product),
    ...mapVariantForTracking(variant),
    ...mapPriceToTracking(unitPrice),
    quantity: item.quantity,
    discount: getTrackingDiscount(unitPrice),
  }
}

/**
 * Minimal promotion fields for GA4 `view_promotion` / `select_promotion` events.
 */
export interface PromotionTrackingFields {
  promotion_id: string
  promotion_name: string
}

/**
 * Maps a V3 promotion to the GA4 promotion fields used by
 * `view_promotion` / `select_promotion` events.
 *
 * @param promotion The promotion to map.
 * @returns The promotion id and name fields.
 */
export function mapPromotionToTrackingItem(
  promotion: Promotion,
): PromotionTrackingFields {
  return {
    promotion_id: promotion.id,
    promotion_name: promotion.name,
  }
}

/**
 * Maps a V3 campaign to the GA4 promotion fields used by
 * `view_promotion` / `select_promotion` events.
 *
 * @param campaign The campaign to map.
 * @returns The promotion id and name fields.
 */
export function mapCampaignToTrackingItem(
  campaign: Campaign,
): PromotionTrackingFields {
  return {
    promotion_id: campaign.id,
    promotion_name: campaign.name,
  }
}

/**
 * Maps a product to the flattened product properties of a SCAYLE Analytics event
 * (`view_product_tile`, `select_product`, `view_product_detail`, basket and
 * wishlist events). List context (`product_list_type`, `position`, ...) is added
 * by the caller because it depends on the surface, not on the product.
 *
 * Money stays in minor units, as in the request body. `brand_id` is omitted
 * when the storefront does not expose a brand attribute value id, so the
 * dimension only ever holds ids, never display names.
 *
 * `campaignId` is the id of the shop's active campaign (the `campaign` shared
 * prop) and reaches the event only when the reported price carries a campaign
 * reduction, which is what makes the product part of the campaign. A product
 * priced without a campaign reduction gets no `campaign_id` even while a
 * campaign runs. Without a `variant` the product-level price decides, as it
 * does for `price` and `discount`, so a tile whose cheapest variant is not
 * campaign-reduced reports no `campaign_id` even when a pricier variant is.
 *
 * @param product The product being mapped (PLP listing shape or PDP detail shape).
 * @param options Mapping options.
 * @param options.variant Variant the user interacts with. Its price and id win
 *   over the product-level ones.
 * @param options.campaignId Id of the shop's active campaign, omitted when none
 *   runs.
 *
 * @returns Flattened product properties for a SCAYLE Analytics event.
 */
export function mapProductForAnalytics(
  product: ListingProduct,
  options: { variant?: ProductVariant; campaignId?: string } = {},
): AnalyticsEventProduct {
  const { variant, campaignId } = options
  const price = variant?.price ?? product.price

  return {
    product_id: product.id.toString(),
    brand_id: product.brandId?.toString(),
    variant_id: variant?.id.toString(),
    campaign_id: price.hasCampaignReduction ? campaignId : undefined,
    price: price.finalPriceInCents as CentAmount,
    // A zero reduction is omitted rather than sent as `0`, so the dimension
    // only carries actual reductions. GA4's `discount` keeps the explicit `0`.
    discount: price.totalReductionInCents
      ? (price.totalReductionInCents as CentAmount)
      : undefined,
  }
}

/**
 * Maps a basket line to the SCAYLE Analytics product entry used by
 * `remove_from_basket` and `view_basket`.
 *
 * Reuses `mapProductForAnalytics` for the product, variant and unit price and
 * adds the basket-only fields: the line `quantity`, the ids of the promotions
 * applied to the line (`[]` when none) and, for `view_basket`, the line's
 * 1-based `position` among `total` lines.
 *
 * @param item The basket item to map.
 * @param options Mapping options.
 * @param options.campaignId Id of the shop's active campaign, omitted when none
 *   runs.
 * @param options.position 1-based position of the line in the basket. Set with
 *   `total`.
 * @param options.total Number of lines in the basket. Set with `position`.
 *
 * @returns The flattened product entry with basket quantity and promotion ids.
 */
export function mapBasketItemForAnalytics(
  item: BasketItem,
  options: { campaignId?: string; position?: number; total?: number } = {},
): AnalyticsEventProduct {
  // The basket unit price carries the basket-level reductions (promotions,
  // vouchers) the variant's catalog price does not, so it replaces that price.
  return {
    ...mapProductForAnalytics(item.product, {
      variant: { ...item.variant, price: item.unitPrice },
      campaignId: options.campaignId,
    }),
    quantity: item.quantity,
    promotion_ids: item.promotions.map((promotion) => promotion.id),
    position: options.position,
    total: options.total,
  }
}

/**
 * Maps the camelCase entity type of the search domain to the snake_case
 * SCAYLE Analytics vocabulary shared by the `search` destination and the
 * suggestion events.
 */
export const ANALYTICS_SEARCH_ENTITY_TYPES: Record<
  SearchResolveResult['type'],
  AnalyticsSuggestionType
> = {
  category: 'category',
  product: 'product',
  navigationItem: 'navigation_item',
}

/**
 * Maps one dropdown row to the shared properties of the SCAYLE Analytics
 * suggestion events.
 *
 * @param storefront The `storefront` shared prop, which gives the row's link
 *   its country prefix
 * @param entry Suggestion row with its group
 * @param position 1-based position in the dropdown
 * @param total Suggestions rendered in the dropdown
 * @param searchTerm Query typed when the dropdown rendered
 * @returns Suggestion properties with the row's link, country prefix
 * included, as `suggestion_url`, and `suggestion_filter_groups` only for a
 * category that has filter groups
 */
export function mapSearchSuggestionForAnalytics(
  storefront: PageProps['storefront'],
  entry: SearchSuggestionEntry,
  position: number,
  total: number,
  searchTerm: string,
): AnalyticsSearchSuggestionProperties {
  const shared = {
    position,
    total,
    search_term: searchTerm,
    suggestion_type: ANALYTICS_SEARCH_ENTITY_TYPES[entry.type],
  }

  if (entry.type === 'product') {
    return {
      ...shared,
      suggestion_id: String(entry.item.product.id),
      suggestion_url: localizeLink(storefront, entry.item.product.link),
    }
  }

  return {
    ...shared,
    suggestion_id: String(entry.item.id),
    suggestion_url: localizeLink(storefront, entry.item.link),
    ...(entry.type === 'category' && entry.item.filters.length
      ? { suggestion_filter_groups: entry.item.filters.map((f) => f.key) }
      : {}),
  }
}
