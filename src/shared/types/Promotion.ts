import type {
  Promotion,
  PromotionEffect,
  PromotionTier,
} from '@scayle/storefront/types'
import type { CSSProperties } from 'vue'

/**
 * Product-specific promotion configuration from custom data.
 */
export interface PromotionProductConfig {
  /** The attribute ID used to match products. */
  attributeId: number
  /** The attribute group ID used to match products. */
  attributeGroupId: number
  /** The badge label for the promotion. */
  badgeLabel?: string
}

declare module '@scayle/storefront/types' {
  /**
   * Tenant-specific promotion fields, sourced from SCAYLE Panel `customData`
   * (plus the presentational `headline`), layered onto the base `Promotion`
   * by `PromotionMapperService`.
   *
   * The `Effect` type parameter is repeated verbatim from the base declaration:
   * interface-merge augmentations must have identical type parameters, even
   * though this block does not reference it.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Promotion<Effect = PromotionEffect> {
    /** Display headline; falls back to the promotion `name` when `displayName` is absent or empty. */
    headline: string
    /** Secondary text shown beneath the headline. */
    subline?: string
    /** URL the promotion links to; defaults to `''`. */
    link: string
    /** Whether the countdown timer is hidden; defaults to `false`. */
    hideCountdown: boolean
    /** Condition display string; defaults to `''`. */
    conditions: string
    /** Color configuration for the promotion display, as Vue inline styles. */
    color: Pick<CSSProperties, 'backgroundColor' | 'color'>
    /** Product-matching configuration for badges and deals. */
    product?: PromotionProductConfig
    /** Whether to visually emphasize matching product cards on PLPs and sliders. */
    highlightProductCards?: boolean
  }

  /**
   * Tenant-specific campaign field: `color`, transformed from the raw
   * `{ background, text }` custom data to Vue `CSSProperties` by
   * `CampaignMapperService`. The transform stays app-side because
   * `@scayle/storefront` is framework-agnostic and must not depend on Vue.
   */
  interface Campaign {
    /** Color configuration for the campaign display, as Vue inline styles. */
    color: Pick<CSSProperties, 'backgroundColor' | 'color'>
  }
}

/**
 * Promotion whose `tiers` are guaranteed present, for tiered-promotion UI.
 */
export interface TieredPromotion extends Promotion {
  /** Tiers for tiered promotions (e.g., spend 100€ get 10%, spend 200€ get 15%). */
  tiers: PromotionTier[]
}
