import type {
  CMSCspConfig,
  CMSEditorData,
  CMSProviderService,
  CMSPageMeta,
} from '@scayle/storefront/cms'
import type { CMSPageData } from '@shared/types/cms/scayle'
import type { IncomingRequest, StorefrontContext } from '@scayle/storefront'

/**
 * CSP configuration for the Scayle default provider.
 * No editor embedding needed, so no CSP adjustments.
 */
export const cspConfig: CMSCspConfig = {
  directives: {},
}

/**
 * Accepts the placeholder provider, which needs no environment variables.
 * Exists so `@cms-server/service` exports `parseCmsEnv` for every provider,
 * including the `scayle` directory that typecheck maps `@cms-server/*` to.
 */
export const parseCmsEnv = (): void => {}

const DEFAULT_PLACEHOLDER_CONTENT: CMSPageData = {
  headline: 'SCAYLE CMS - Placeholder page',
  description:
    'CMS is configured with the default Scayle provider. Configure a CMS provider to render managed content.',
}

/**
 * Returns placeholder SEO metadata for the Scayle default provider.
 *
 * @param _data Placeholder page data (unused)
 * @returns Placeholder CMS metadata
 */
export const getPageMeta = (_data: CMSPageData): CMSPageMeta => ({
  title: 'SCAYLE CMS - Placeholder',
  description:
    'No external CMS provider is active. Configure Storyblok, Contentful, or Contentstack.',
  robots: 'noindex, nofollow',
})

/**
 * Creates the Scayle CMS provider service instance.
 * Takes `storefront` for signature parity with the other providers'
 * `createCMSService()`, though the placeholder has no content to cache.
 *
 * @returns Scayle placeholder CMS service
 */
export const createCMSService = (
  _storefront: StorefrontContext,
): ScayleCMSService => new ScayleCMSService()

/**
 * Provides a default placeholder CMS service.
 * Used when no external CMS provider is configured.
 * @see https://scayle.dev/documentation/storefront/storefront-application-v3/features/content/cms
 */
export class ScayleCMSService implements CMSProviderService<CMSPageData> {
  readonly cspConfig: CMSCspConfig = cspConfig

  isEditorMode(_request: IncomingRequest): boolean {
    return false
  }

  getCMSEditorData(_request: IncomingRequest): CMSEditorData | undefined {
    return undefined
  }

  fetchPageData(
    _slug: string,
    _request: IncomingRequest,
  ): Promise<CMSPageData | undefined> {
    return Promise.resolve(DEFAULT_PLACEHOLDER_CONTENT)
  }

  /**
   * The placeholder has no per-category content, so product listing pages
   * render without CMS content rather than repeating the placeholder page copy
   * under every category.
   *
   * @param _categoryId SCAYLE category ID (unused)
   * @param _request Inbound request (unused)
   * @returns Always undefined
   */
  fetchListingPageData(
    _categoryId: number,
    _request: IncomingRequest,
  ): Promise<CMSPageData | undefined> {
    return Promise.resolve(undefined)
  }
}
