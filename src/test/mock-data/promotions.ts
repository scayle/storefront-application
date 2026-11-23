import type { CentAmount } from '@scayle/storefront-api'
import type { Campaign, Promotion } from '@scayle/storefront/types'
import type { TieredPromotion } from '@shared/types/Promotion'

/** Starts in the past and ends far in the future, so the promotion counts as running. */
const runningSchedule = {
  from: '2026-01-01T00:00:00Z',
  to: '2099-12-31T23:59:59Z',
}

/**
 * Creates a mock running `Promotion` as `PromotionMapperService` maps it: a 10%
 * automatic discount (`-10%`), the mapper's fallback `link`, `conditions`,
 * `color` and `highlightProductCards`, and no tiers.
 *
 * @param overrides Promotion fields merged over the defaults.
 * @returns A complete promotion.
 */
export function createMockPromotion(
  overrides: Partial<Promotion> = {},
): Promotion {
  return {
    id: 'promo-1',
    name: 'Summer Sale',
    priority: 1,
    schedule: { ...runningSchedule },
    effect: {
      type: 'automatic_discount',
      discountType: 'relative',
      value: '-10%',
      isFree: false,
    },
    headline: 'Summer Sale',
    link: '',
    hideCountdown: false,
    conditions: '',
    color: {
      backgroundColor: 'var(--color-promotion)',
      color: 'var(--color-primary)',
    },
    highlightProductCards: false,
    ...overrides,
  }
}

/**
 * Creates a mock `TieredPromotion` with three minimum order value tiers: 10% off
 * from €50.00, 15% off from €100.00 and 20% off from €150.00.
 *
 * @param overrides Promotion fields merged over the defaults.
 * @returns A complete tiered promotion.
 */
export function createMockTieredPromotion(
  overrides: Partial<TieredPromotion> = {},
): TieredPromotion {
  return {
    ...createMockPromotion({ id: 'tiered-promo-1', name: 'Spend More' }),
    headline: 'Spend more, save more',
    tiers: [
      {
        id: 1,
        name: 'Tier 1',
        mov: 5000 as CentAmount,
        effect: {
          type: 'automatic_discount',
          discountType: 'relative',
          value: '-10%',
          isFree: false,
        },
      },
      {
        id: 2,
        name: 'Tier 2',
        mov: 10000 as CentAmount,
        effect: {
          type: 'automatic_discount',
          discountType: 'relative',
          value: '-15%',
          isFree: false,
        },
      },
      {
        id: 3,
        name: 'Tier 3',
        mov: 15000 as CentAmount,
        effect: {
          type: 'automatic_discount',
          discountType: 'relative',
          value: '-20%',
          isFree: false,
        },
      },
    ],
    ...overrides,
  }
}

/**
 * Creates a mock running `Campaign` with a 20% reduction, as
 * `CampaignMapperService` maps it with its fallback `color`.
 *
 * @param overrides Campaign fields merged over the defaults.
 * @returns A complete campaign.
 */
export function createMockCampaign(
  overrides: Partial<Campaign> = {},
): Campaign {
  return {
    // The mapper stringifies the numeric Storefront API id.
    id: '1',
    key: 'summer-campaign',
    name: 'Summer Campaign',
    reduction: 20,
    schedule: { ...runningSchedule },
    headline: 'Summer Campaign',
    subline: '',
    link: '',
    hideCountdown: false,
    conditions: '',
    color: {
      backgroundColor: 'var(--color-campaign)',
      color: 'var(--color-primary)',
    },
    ...overrides,
  }
}
