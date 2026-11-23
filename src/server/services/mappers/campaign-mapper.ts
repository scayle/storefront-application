import type { Campaign as StorefrontAPICampaign } from '@scayle/storefront-api'
import { CampaignMapper } from '@scayle/storefront/mappers'
import type { Campaign } from '@scayle/storefront/types'

/**
 * Maps a Storefront API campaign to the application `Campaign` type.
 *
 * Extends the tenant-invariant base {@link CampaignMapper} and layers the only
 * tenant-specific concern: transforming the raw `{ background, text }` color
 * into Vue `CSSProperties` with theme-variable fallbacks. This transform stays
 * app-side because `@scayle/storefront` is framework-agnostic and must not
 * depend on Vue.
 *
 * @example
 * ```ts
 * const mapper = new CampaignMapperService(context)
 * const campaign = mapper.mapCampaign(apiCampaign)
 * ```
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/architecture/extending-sdk
 */
export class CampaignMapperService extends CampaignMapper {
  /**
   * Maps a Storefront API campaign to the application `Campaign`, reusing the
   * base mapping and overriding `color` with Vue inline styles.
   *
   * @param campaign Raw campaign from the Storefront API.
   * @returns Mapped `Campaign` ready for use in views and components.
   */
  public override mapCampaign(campaign: StorefrontAPICampaign): Campaign {
    return {
      ...super.mapCampaign(campaign),
      color: {
        backgroundColor: campaign.color?.background || 'var(--color-campaign)',
        color: campaign.color?.text || 'var(--color-primary)',
      },
    }
  }
}
