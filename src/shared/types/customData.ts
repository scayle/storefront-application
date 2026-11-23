/**
 * SCAYLE Panel fields must match these types
 */
import type { CentAmount } from '@scayle/storefront-api'

export interface DeliveryCosts {
  value: string
  disclaimer: string
}

declare module '@scayle/storefront-api' {
  interface ShopCountryCustomData {
    deliveryCosts?: DeliveryCosts
  }

  /**
   * Custom data structure for promotions, configurable in the SCAYLE Panel.
   * Which fields are present depends on what is set in the panel. When new custom
   * fields are added or used in the panel, this type declaration must be updated
   * to match.
   */
  interface PromotionCustomData {
    /** Product badge configuration with attribute ID and label */
    product?: {
      attributeId: number
      attributeGroupId: number
      badgeLabel?: string
    }
    /** Secondary text displayed below the headline */
    subline?: string
    /** Terms and conditions text for the promotion */
    conditions?: string
    /** Minimum order value required for promotion eligibility */
    minimumOrderValue?: CentAmount
    /** Custom color scheme for promotion display */
    color?: {
      background: string
      text: string
    }
    /** Whether to hide the countdown timer */
    hideCountdown?: boolean
    /** Link URL or route for the promotion */
    link?: string
    /** Whether to visually emphasize matching product cards with a border and repositioned badge on PPLs and Sliders */
    highlightProductCards?: boolean
  }

  interface NavigationItemCustomData {
    linkColor?: string
    disabledLink?: boolean
  }
}
