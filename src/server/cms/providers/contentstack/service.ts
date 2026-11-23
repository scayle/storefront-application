import { ContentstackCMSService as BaseContentstackCMSService } from '@scayle/storefront-cms-contentstack'
import type { CMSPageMeta } from '@scayle/storefront/cms'
import type { CMSPageData } from '@shared/types/cms/contentstack'
import type { StorefrontContext } from '@scayle/storefront'
import { z } from 'zod'
import { parseEnv, requiredEnv } from '@server/cms/utils/env'

export { cspConfig } from '@scayle/storefront-cms-contentstack'

// The region is not checked here: `ContentstackCMSService` resolves it against
// the package's own region list, so a copy in this schema would drift.
const contentstackEnvSchema = z.object({
  CONTENTSTACK_CMS_STACK_API_KEY: requiredEnv,
  CONTENTSTACK_CMS_DELIVERY_TOKEN: requiredEnv,
  CONTENTSTACK_CMS_ENVIRONMENT: requiredEnv,
  CONTENTSTACK_CMS_REGION: z.string().optional(),
  CONTENTSTACK_CMS_BRANCH: z.string().optional(),
  CONTENTSTACK_CMS_PREVIEW_ACCESS_TOKEN: z.string().optional(),
})

/**
 * Validates the Contentstack credentials in `process.env`.
 * Called at boot from the server entry and again by `createCMSService()`.
 *
 * @returns The Contentstack environment variables, with the optional ones
 * possibly undefined
 * @throws Error listing every missing or empty required variable
 */
export const parseCmsEnv = () => parseEnv('Contentstack', contentstackEnvSchema)

interface PageComponentEntry {
  seo?: {
    meta_title?: string
    meta_description?: string
    robots?: string
    social_share_image?: { url?: string }
  }
}

interface ListingComponentEntry {
  seo?: { meta_title?: string }
  social_share_image?: { url?: string }
}

const isPageComponent = (entry: unknown): entry is PageComponentEntry => {
  return (
    !!entry &&
    typeof entry === 'object' &&
    'seo' in entry &&
    typeof entry.seo === 'object'
  )
}

const isProductlistingpageComponent = (
  entry: unknown,
): entry is ListingComponentEntry => {
  return (
    !!entry &&
    typeof entry === 'object' &&
    'seo' in entry &&
    typeof entry.seo === 'object' &&
    'social_share_image' in entry
  )
}

/**
 * Extracts SEO metadata from a Contentstack page.
 * Reads tenant-specific field names from the page content schema.
 *
 * @param data Contentstack page data
 * @returns SEO metadata or undefined if the page type is not supported
 */
export const getPageMeta = (data: CMSPageData): CMSPageMeta | undefined => {
  const entry: unknown = data?.entry

  if (isPageComponent(entry) && entry.seo) {
    return {
      title: entry.seo.meta_title,
      description: entry.seo.meta_description,
      robots: entry.seo.robots ?? undefined,
      image: entry.seo.social_share_image?.url ?? undefined,
    }
  }

  if (isProductlistingpageComponent(entry) && entry.social_share_image) {
    return { image: entry.social_share_image?.url ?? undefined }
  }

  return undefined
}

// See https://scayle.dev/documentation/storefront/storefront-application-v3/features/content/cms/contentstack
export class ContentstackCMSService extends BaseContentstackCMSService<CMSPageData> {}

/**
 * Creates the Contentstack CMS provider service instance.
 * Validates the environment when called, not when the module is imported, so
 * module import does not throw during test setup.
 *
 * @param storefront Storefront context, used for application-level caching
 * @returns Contentstack CMS service
 * @throws Error when a required Contentstack environment variable is missing
 * or empty, or when the region is not a recognized Contentstack region
 */
export const createCMSService = (
  storefront: StorefrontContext,
): ContentstackCMSService => {
  const env = parseCmsEnv()

  return new ContentstackCMSService(
    {
      apiKey: env.CONTENTSTACK_CMS_STACK_API_KEY,
      deliveryToken: env.CONTENTSTACK_CMS_DELIVERY_TOKEN,
      environment: env.CONTENTSTACK_CMS_ENVIRONMENT,
      region: env.CONTENTSTACK_CMS_REGION,
      branch: env.CONTENTSTACK_CMS_BRANCH,
      previewAccessToken: env.CONTENTSTACK_CMS_PREVIEW_ACCESS_TOKEN,
      draftContentEnabled:
        process.env.STOREFRONT_CMS_ALLOW_DRAFTS?.toLowerCase() === 'true',
    },
    storefront,
  )
}
